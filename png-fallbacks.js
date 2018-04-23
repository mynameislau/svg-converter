'use strict';

const nightmare = require('nightmare');
const express = require('express');
const fs = require('fs');
const handlebars = require('handlebars');
const through = require('through2');

const app = express();

const getLogger = (verbose = false) =>
  (verbose ? console.log : () => { return; });

const templateRead = new Promise((resolve, reject) => {
  fs.readFile(`${__dirname}/template.hbs`, (err, data) => {
    if (err) { reject(err); }
    resolve(data.toString());
  });
})
.catch(error => console.error(error));

const listening = new Promise((resolve, reject) => {
  const listener = app.listen(0, () => {
    resolve(listener);
  });
})
.catch(error => console.error(error));

const captureImages = (nightmareInst, imgData, imgID) => {
  return nightmareInst.evaluate((browserDataIMG, browserIMGID) => {
    const img = window.document.createElement('img');
    const imgElement = window.document.body.appendChild(img);

    imgElement.setAttribute('data-loaded', 'false');
    imgElement.setAttribute('id', browserIMGID);
    imgElement.addEventListener('load', () => {
      imgElement.setAttribute('data-loaded', 'true');
    });

    imgElement.setAttribute('src', `data:image/svg+xml;base64,${browserDataIMG}`);

    return imgElement.getAttribute('data-path');
  }, imgData, imgID)
  .wait(`#${imgID}[data-loaded="true"]`)
  .evaluate((browserIMGID) => {
    const cumulativeOffset = element => {
      let top = 0;
      let left = 0;

      do {
        top += element.offsetTop || 0;
        left += element.offsetLeft || 0;
        element = element.offsetParent;
      } while (element);

      return {
        top: top,
        left: left
      };
    };

    const imgElement = window.document.getElementById(browserIMGID);
    const offset = cumulativeOffset(imgElement);

    return {
      size: {
        x: offset.left,
        y: offset.top,
        width: imgElement.offsetWidth,
        height: imgElement.offsetHeight
      }
    };
  }, imgID)
  .then(image => {
    return nightmareInst.screenshot(image.size)
    .then(screen => {
      return nightmareInst.evaluate((browserIMGID) => {
        const imgElement = window.document.getElementById(browserIMGID);

        return imgElement.parentElement.removeChild(imgElement);
      }, imgID)
      .then(() => {
        return screen;
      });
    })
    .catch(error => console.error(error));
  })
  .catch(error => console.error(error));
};

Promise.all([templateRead, listening])
.then(([template]) => {
  app.get('/', (req, res) => {
    const rendered = handlebars.compile(template)({
    });

    res.send(rendered);
  });
});

let id = 0;

module.exports = (opts) => {
  const log = getLogger(opts.debug);
  log('ok');
  const nightmareInst = nightmare();

  const nightmareWaitOver = Promise.all([listening, templateRead])
  .then(([listener]) => new Promise((resolve, reject) => {
    const port = listener.address().port;

    nightmareInst.goto(`http://localhost:${port}/`)
    .viewport(1000, 1000) // TODO
    .wait()
    .then(() => {
      resolve();
    });
  }));

  return through.obj((file, enc, end) => {
    if (file.isNull()) { return end(null, file); }

    Promise.all([listening, nightmareWaitOver]).then(([listener]) => {
      id = id + 1;
      log('processing chunk :', id, file.basename);
      captureImages(nightmareInst, file.contents.toString('base64'), `img-${id}`, listener.address().port)
      .then(pngBuffer => {
        file.contents = pngBuffer;
        file.dirname = `${file.dirname}/fallback-png`;
        file.extname = '.png';
        end(null, file);
      })
      .catch(reason => console.error(reason));
    });

    return null;
  }, (end) => {
    log('flushing');
    nightmareInst.end();
    end();
  });
};

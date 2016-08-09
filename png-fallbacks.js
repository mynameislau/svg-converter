'use strict';

const nightmare = require('nightmare');
const express = require('express');
const fs = require('fs');
const handlebars = require('handlebars');
const path = require('path');
const through = require('through2');

const app = express();

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

const nightmareInst = nightmare();

const nightmareWaitOver = Promise.all([listening, templateRead])
.then(([listener]) => new Promise((resolve, reject) => {
  const port = listener.address().port;

  const wait = nightmareInst.goto(`http://localhost:${port}/`)
  .viewport(1000, 1000) // TODO
  .wait()
  .then(() => {
    resolve();
  });
}));

const captureImages = (imgData) => {

  return nightmareWaitOver.then(() => {

    return nightmareInst.evaluate(browserDataIMG => {
      const imgElement = window.document.querySelector('img');

      imgElement.addEventListener('load', () => {
        imgElement.setAttribute('data-loaded', true);
      });

      imgElement.setAttribute('src', `data:image/svg+xml;base64,${browserDataIMG}`);
    }, imgData)
    .wait('[data-loaded]')
    .evaluate(() => {
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

      const imgElement = window.document.querySelector('img');
      const offset = cumulativeOffset(imgElement);

      return {
        size: {
          x: offset.left,
          y: offset.top,
          width: imgElement.offsetWidth,
          height: imgElement.offsetHeight
        }
      };
    });
  })
  .then(image => {
    return nightmareInst.screenshot(image.size);
  })
  .catch(error => console.error('errororoo' + error));
};

const svgObjects = {};

Promise.all([templateRead, listening])
.then(([template]) => {
  app.get('/', (req, res) => {
    const reqName = req.params.svg_name;
    const svgData = svgObjects[reqName];
    const rendered = handlebars.compile(template)({
      svgData: svgData
    });

    res.send(rendered);
  });
});

module.exports = () => {
  return through.obj((file, enc, end) => {
    if (file.isNull()) { return end(null, file); }

    listening.then(listener => {
      captureImages(file.contents.toString('base64'), listener.address().port)
      .then(pngBuffer => {
        file.contents = pngBuffer;
        file.dirname = `${file.dirname}/fallback-png`;
        file.extname = '.png';
        end(null, file);
      })
      .catch(reason => console.error(reason));
    });

    return null;
  });
};

'use strict';

const nightmare = require('nightmare');
const express = require('express');
const fs = require('fs');
const handlebars = require('handlebars');
const path = require('path');
const through = require('through2');

const app = express();

app.use(express.static('./images'));

const templateRead = new Promise((resolve, reject) => {
  fs.readFile('./template.hbs', (err, data) => {
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

const captureImages = (imgName, port) => {
  const nightmareInst = nightmare();

  return nightmareInst.goto(`http://localhost:${port}/${imgName}`)
  .viewport(1000, 1000) // TODO
  .wait()
  .evaluate(() => ({
    width: window.innerWidth,
    height: window.document.body.offsetHeight
  }))
  .then(({ width, height }) => {
    const promise = nightmareInst // .viewport(width, height)
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
        src: imgElement.getAttribute('src'),
        size: {
          x: offset.left,
          y: offset.top,
          width: imgElement.offsetWidth,
          height: imgElement.offsetHeight
        }
      };
    });

    return promise;
  })
  .then(image =>
    nightmareInst.screenshot(image.size)
  )
  .catch(error => console.error(error));
};

const svgObjects = {};

Promise.all([templateRead, listening])
.then(([template]) => {
  app.get('/:svg_name', (req, res) => {
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

    svgObjects[file.stem] = file.contents.toString('base64');

    listening.then(listener => {
      captureImages(file.stem, listener.address().port)
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

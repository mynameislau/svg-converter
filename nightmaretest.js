const nightmare = require('nightmare');
const express = require('express');
const fs = require('fs');
const handlebars = require('handlebars');
const path = require('path');
// nightmare
// .on('load', () => console.log('onload'))
// .goto('http://google.com')
// .wait()
// .evaluate(() => window)
// .end()
// .then(result => {
//   console.log(result);
// });

const app = express();

app.use(express.static('./images'));

const imagesDirectoryRead = new Promise((resolve, reject) => {
  fs.readdir('./images', (err, files) => {
    if (err) { reject(err); }
    resolve(files);
  });
})
.catch(error => console.error(error));

const templateRead = new Promise((resolve, reject) => {
  fs.readFile('./template.hbs', (err, data) => {
    if (err) { reject(err); }
    resolve(data.toString());
  });
})
.catch(error => console.error(error));

const listening = new Promise((resolve, reject) => {
  app.listen(3005, () => {
    resolve();
  });
})
.catch(error => console.error(error));

// app.get('/', (req, res) => {
//   fs.readFile('./template.hbs', (err, data) => {
//     fs.readdir('./images', (err, files) => {
//       const rendered = handlebars.compile(data.toString())({
//         images: files
//       });
//       res.send(rendered);
//     });
//   });
// });

const captureImages = (imgObj) => {
  const nightmareInst = nightmare();

  nightmareInst.goto(`http://localhost:3005/${imgObj.name}`)
  .viewport(1000, 1000)
  .wait()
  .evaluate(() => ({
      width: window.innerWidth,
      height: window.document.body.offsetHeight
    })
  )
  .then(({width, height}) => {
    // console.log(width, height);
    const promise = nightmareInst// .viewport(width, height)
    .evaluate(() => {
      const cumulativeOffset = function (element) {
        var top = 0;
        var left = 0;

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

      // const images = [].concat(...window.document.querySelectorAll('img'))
      // .map(imgElement => {
      //   const offset = cumulativeOffset(imgElement);
      //   return {
      //     src: imgElement.getAttribute('src'),
      //     size: {
      //       x: offset.left,
      //       y: offset.top,
      //       width: imgElement.offsetWidth,
      //       height: imgElement.offsetHeight
      //     }
      //   };
      // });

      // return images;
    });

    return promise;
  })
  .then(image => {

    const night = nightmareInst
    .screenshot(`output/${imgObj.name}.png`, image.size)
    // images.reduce((prev, currValue) => {
    //   //console.log(currValue, `output/${currValue.src}.png`);
    //   return prev
    //   // .scrollTo(currValue.size.x, currValue.size.x)
    //   .screenshot(`output/${currValue.src}.png`, currValue.size)
    // }, night)
    .end()
    //.then(() => console.log('done'))
    .catch(error => console.error(error));
    // size = s;
    // console.log(size);
    // nightmareInst.screenshot('./truc.png');
  })
  .catch(error => console.error(error));
};

Promise.all([imagesDirectoryRead, templateRead, listening])
.then(([imgDir, template]) => {

  Promise.all(imgDir.map(imgPath => new Promise((resolve, reject) => {
    fs.readFile(`./images/${imgPath}`, (err, data) => {
      if (err) { reject(err); }
      resolve({
        name: path.parse(imgPath).name,
        data: data.toString('base64')
      });
    });
  })))
  .then(svgObjects => {
    app.get('/:svg_name', (req, res) => {
      const reqName = req.params.svg_name;
      const svgObject = svgObjects.reduce((prev, currValue) => currValue.name === reqName ? currValue : prev, null);
      const rendered = handlebars.compile(template)({
        svgName: svgObject.name,
        svgData: svgObject.data
      });
      res.send(rendered);
    });

    svgObjects.forEach(svgObject => {
        captureImages(svgObject)
      })
  });

    //captureImages(path.parse(imgPath).name);
  // });

  //console.log('pouet', captureImages());
})
.catch(error => console.error(error));


// let size = null;
// app.listen(3005, () => {
//   console.log('listening');




// });
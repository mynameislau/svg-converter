const gulp = require('gulp');
const pngFallback = require('./png-fallbacks');

// gulp.task('default', () => {
//   return gulp.src('./images/*.svg')
//   .pipe(pngFallback())
//   .pipe(gulp.dest('./images/'))
//   .on('end', () => console.log('end'))
//   .on('error', error => console.error(error));
// });

const conf = {
  paths: [
    { src: 'images', dest: 'images' },
    { src: 'other-images', dest: 'other-images' }
  ]
};



  // copying assets
const generateFallbacks = () => {
  // const folder = `${src}/**/*.svg`;

  const allFoldersFallbacks = conf.paths.map(path => new Promise((resolve, reject) => {
    gulp.src(`./${path.src}/**/*.svg`)
    .pipe(pngFallback({
      debug: true
    }))
    .on('error', error => reject(error))
    .pipe(gulp.dest(`./${path.dest}`))
    .on('end', () => {
      resolve();
      console.log('fini');
    });
  }));

  return Promise.all(allFoldersFallbacks);
};

gulp.task('default', generateFallbacks);
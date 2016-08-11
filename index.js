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
    .pipe(pngFallback())
    .on('error', error => reject(error))
    .on('end', () => resolve())
    .pipe(gulp.dest(`./${path.dest}`));
  }));

  return Promise.all(allFoldersFallbacks);
};

gulp.task('default', generateFallbacks);
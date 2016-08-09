const gulp = require('gulp');
const pngFallback = require('./png-fallbacks');

gulp.task('default', () => {
  return gulp.src('./images/*.svg')
  .pipe(pngFallback())
  .pipe(gulp.dest('./images/'))
  .on('end', () => console.log('end'))
  .on('error', error => console.error(error));
});
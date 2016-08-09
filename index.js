const gulp = require('gulp');
const pngFallback = require('./png-fallback');

gulp.task('default', () => {
  return gulp.src('./images/*.svg')
  .pipe(pngFallback())
  .pipe(gulp.dest('./output/'))
  .on('end', () => console.log('end'))
  .on('error', error => console.error(error));
});
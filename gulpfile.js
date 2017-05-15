const gulp = require('gulp')
const gulpLoadPlugins = require('gulp-load-plugins')
const browserSync = require('browser-sync').create()
const del = require('del')
const wiredep = require('wiredep').stream
const runSequence = require('run-sequence')
const mainBowerFiles = require('main-bower-files')

const $ = gulpLoadPlugins()
const reload = browserSync.reload

const src = 'app'
const temp = '.tmp'
const dist = 'dist'

let dev = true

gulp.task('styles', () => {
  return gulp.src(`${src}/**/*.scss`, { base: src })
    .pipe($.plumber())
    .pipe($.if(dev, $.sourcemaps.init()))
    .pipe($.sass.sync({
      outputStyle: 'expanded',
      precision: 10,
      includePaths: ['.']
    }).on('error', $.sass.logError))
    .pipe($.autoprefixer({ browsers: ['> 1%', 'last 2 versions', 'Firefox ESR'] }))
    .pipe($.if(dev, $.sourcemaps.write()))
    .pipe(gulp.dest(temp))
    .pipe(reload({stream: true}))
})

gulp.task('scripts', () => {
  return gulp.src(`${src}/**/*.js`, { base: src })
    .pipe($.plumber())
    .pipe($.if(dev, $.sourcemaps.init()))
    .pipe($.babel())
    .pipe($.if(dev, $.sourcemaps.write('.')))
    .pipe(gulp.dest(temp))
    .pipe(reload({stream: true}))
})

gulp.task('lint', () => {
  return gulp.src(`${src}/**/*.js`, { base: src })
    .pipe($.eslint({ fix: true }))
    .pipe(reload({ stream: true, once: true }))
    .pipe($.eslint.format())
    .pipe($.if(!browserSync.active, $.eslint.failAfterError()))
    .pipe(gulp.dest(src))
})

gulp.task('html', ['styles', 'scripts'], () => {
  return gulp.src(`${src}/*.html`, { base: src })
    .pipe($.useref({ searchPath: [temp, src, '.'] }))
    .pipe($.if(/\.js$/, $.uglify({ compress: { drop_console: true }})))
    .pipe($.if(/\.css$/, $.cssnano({ safe: true, autoprefixer: false })))
    .pipe($.if(/\.html$/, $.htmlmin({
      collapseWhitespace: true,
      minifyCSS: true,
      minifyJS: { compress: { drop_console: true } },
      processConditionalComments: true,
      removeComments: true,
      removeEmptyAttributes: true,
      removeScriptTypeAttributes: true,
      removeStyleLinkTypeAttributes: true
    })))
    .pipe(gulp.dest(dist))
})

gulp.task('images', () => {
  return gulp.src(`${src}/**/images/**/*`, { base: src })
    .pipe($.cache($.imagemin()))
    .pipe(gulp.dest(dist))
})

gulp.task('fonts', () => {
  return gulp.src(mainBowerFiles('**/*.{eot,svg,ttf,woff,woff2}').concat(`${src}/**/fonts/**/*`), { base: src })
    .pipe($.if(dev, gulp.dest(temp), gulp.dest(dist)))
})

gulp.task('extras', () => {
  return gulp.src([`${src}/*`, `!${src}/*.html`], { dot: true })
    .pipe(gulp.dest(dist))
})

gulp.task('clean', del.bind(null, [temp, dist]))

gulp.task('serve', () => {
  runSequence(['clean', 'wiredep'], ['styles', 'scripts', 'fonts'], () => {
    browserSync.init({
      notify: false,
      port: 9000,
      server: {
        baseDir: [temp, src],
        routes: {
          '/bower_components': 'bower_components'
        }
      }
    })

    gulp.watch([
      `${src}/*.html`,
      `${src}/**/images/**/*`,
      `${temp}/**/fonts/**/*`
    ]).on('change', reload)

    gulp.watch(`${src}/**/*.scss`, ['styles'])
    gulp.watch(`${src}/**/*.js`, ['scripts'])
    gulp.watch(`${src}/**/fonts/**/*`, ['fonts'])
    gulp.watch('bower.json', ['wiredep', 'fonts'])
  })
})

gulp.task('serve:dist', ['default'], () => {
  browserSync.init({
    notify: false,
    port: 9000,
    server: {
      baseDir: [dist]
    }
  })
})

// inject bower components
gulp.task('wiredep', () => {
  gulp.src(`${src}/**/*.scss`, { base: src })
    .pipe($.filter(file => file.stat && file.stat.size))
    .pipe(wiredep({ ignorePath: /^(\.\.\/)+/ }))
    .pipe(gulp.dest(src))

  gulp.src(`${src}/*.html`)
    .pipe(wiredep({
      exclude: ['bootstrap'],
      ignorePath: /^(\.\.\/)*\.\./
    }))
    .pipe(gulp.dest(src))
})

gulp.task('build', ['lint', 'html', 'images', 'fonts', 'extras'], () => {
  return gulp.src(`${dist}/**/*`).pipe($.size({title: 'build', gzip: true}))
})

gulp.task('default', () => {
  return new Promise(resolve => {
    dev = false
    runSequence(['clean', 'wiredep'], 'build', resolve)
  })
})

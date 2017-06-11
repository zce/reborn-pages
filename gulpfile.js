const gulp = require('gulp')
const gulpLoadPlugins = require('gulp-load-plugins')
const mainBowerFiles = require('main-bower-files')
const runSequence = require('run-sequence')
const del = require('del')
const wiredep = require('wiredep').stream
const browserSync = require('browser-sync').create()

const $ = gulpLoadPlugins()

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
    // https://github.com/gulp-sourcemaps/gulp-sourcemaps/issues/60
    .pipe($.if(!dev, $.autoprefixer({ browsers: ['> 1%', 'last 2 versions', 'Firefox ESR'] })))
    .pipe($.if(dev, $.sourcemaps.write()))
    .pipe(gulp.dest(temp))
    .pipe(browserSync.reload({ stream: true }))
})

gulp.task('scripts', () => {
  return gulp.src(`${src}/**/*.js`, { base: src })
    .pipe($.plumber())
    .pipe($.if(dev, $.sourcemaps.init()))
    .pipe($.babel())
    .pipe($.if(dev, $.sourcemaps.write('.')))
    .pipe(gulp.dest(temp))
    .pipe(browserSync.reload({ stream: true }))
})

gulp.task('views', () => {
  return gulp.src(`${src}/*.pug`, { base: src })
    .pipe($.plumber())
    .pipe($.pug({ pretty: true }))
    .pipe(gulp.dest(temp))
    .pipe(browserSync.reload({ stream: true }))
})

gulp.task('lint', () => {
  return gulp.src(`${src}/**/*.js`, { base: src })
    .pipe($.eslint({ fix: true }))
    .pipe(browserSync.reload({ stream: true, once: true }))
    .pipe($.eslint.format())
    .pipe($.if(!browserSync.active, $.eslint.failAfterError()))
    .pipe(gulp.dest(src))
})

gulp.task('html', ['views', 'styles', 'scripts'], () => {
  return gulp.src([`${src}/*.html`, `${temp}/*.html`])
    .pipe($.useref({ searchPath: [temp, src, '.'] }))
    .pipe($.if(/\.js$/, $.uglify({ compress: { drop_console: true } })))
    .pipe($.if(/\.css$/, $.cssnano({ safe: true, autoprefixer: false })))
    .pipe($.if(/\.html$/, $.htmlmin({
      collapseWhitespace: false,
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
  return gulp.src([`${src}/**/images/**/*`, `${src}/uploads/**/*`], { base: src })
    .pipe($.cache($.imagemin()))
    .pipe(gulp.dest(dist))
})

gulp.task('fonts', () => {
  if (!dev) {
    // TODO: bower component folder structure
    gulp.src(mainBowerFiles('**/*.{eot,svg,ttf,woff,woff2}'))
      .pipe(gulp.dest(`${dist}/assets/fonts`))
  }

  return gulp.src(`${src}/**/fonts/**/*`, { base: src })
    .pipe($.if(dev, gulp.dest(temp), gulp.dest(dist)))
})

gulp.task('extras', () => {
  return gulp.src([`${src}/*`, `${src}/*.*`, `!${src}/**/*.html`, `!${src}/**/*.pug`], { base: src, dot: true })
    .pipe(gulp.dest(dist))
})

gulp.task('clean', del.bind(null, [temp, dist]))

gulp.task('serve', () => {
  runSequence(['clean', 'wiredep'], ['views', 'styles', 'scripts', 'fonts'], () => {
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
    ]).on('change', browserSync.reload)

    gulp.watch(`${src}/**/*.pug`, ['views'])
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
    .pipe(wiredep({
      ignorePath: /^(\.\.\/)+/,
      fileTypes: {
        scss: {
          block: /(([ \t]*)\/\/\s*bower:*(\S*))(\n|\r|.)*?(\/\/\s*endbower)/gi,
          detect: {
            css: /@import\s['"](.+css)['"]/gi,
            sass: /@import\s['"](.+sass)['"]/gi,
            scss: /@import\s['"](.+scss)['"]/gi
          },
          replace: {
            css: '@import \'{{filePath}}\';',
            sass: '@import \'{{filePath}}\';',
            scss: '@import \'{{filePath}}\';'
          }
        }
      }
    }))
    .pipe(gulp.dest(src))

  // https://github.com/taptapship/wiredep/pull/239
  // node_modules/wiredep/lib/default-file-types.js
  // jade => pug
  gulp.src(`${src}/**/*.pug`)
    .pipe($.filter(file => file.stat && file.stat.size))
    .pipe(wiredep({
      exclude: ['bootstrap'],
      ignorePath: /^(\.\.\/)*\.\./,
      fileTypes: {
        pug: {
          block: /(([ \t]*)\/\/-?\s*bower:*(\S*))(\n|\r|.)*?(\/\/-?\s*endbower)/gi,
          detect: {
            js: /script\(.*src=['"]([^'"]+)/gi,
            css: /link\(.*href=['"]([^'"]+)/gi
          },
          replace: {
            js: 'script(src=\'{{filePath}}\')',
            css: 'link(rel=\'stylesheet\', href=\'{{filePath}}\')'
          }
        }
      }
    }))
    .pipe(gulp.dest(src))
})

gulp.task('build', ['lint', 'html', 'images', 'fonts', 'extras'], () => {
  return gulp.src(`${dist}/**/*`).pipe($.size({ title: 'build', gzip: true }))
})

gulp.task('default', () => {
  return new Promise(resolve => {
    dev = false
    runSequence(['clean', 'wiredep'], 'build', resolve)
  })
})

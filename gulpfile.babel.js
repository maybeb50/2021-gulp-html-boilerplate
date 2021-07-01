const { series, parallel, src, dest, watch } = require('gulp');
const fileInclude = require('gulp-file-include');
const scss = require('gulp-sass')(require('sass'));
const concat = require('gulp-concat');
const autoprefixer = require('gulp-autoprefixer');
const minifyCSS = require('gulp-clean-css');
const jshint = require('gulp-jshint');
const minifyJS = require('gulp-minify');
const babel = require('gulp-babel');
const spritesmith = require('gulp.spritesmith');
const browserSync = require('browser-sync').create();
const gCached = require('gulp-cached');
const merge = require('merge-stream');
const plumber = require('gulp-plumber');
const notify = require('gulp-notify');
const del = require('del');

const conf = {
    paths: {
        src: './src',
        dist: './dist',
        html: {
            src: './src/html/*.html',
            dist: './dist/html'
        },
        font: {
            src: './src/font/**/*',
            dist: './dist/font'
        },
        scss: {
            src: './src/scss/*.scss',
            dist: './dist/css'
        },
        js: {
            src: './src/js/*.js',
            dist: './dist/js'
        },
        lib: {
            dist: './dist/lib'
        },
        img: {
            src: './src/img/**/*.+(png|jpg|jpeg|gif|svg|mp4)',
            dist: './dist/img'
        }
    }
};

function html() {
    return src(conf.paths.html.src)
        .pipe(fileInclude({
            prefix: '@@',
            basepath: '@file'
        }))
        .pipe(plumber({ errorHandler: onError }))
        .pipe(gCached('html'))
        .pipe(plumber.stop())
        .pipe(dest(conf.paths.html.dist))
}   

function css() {
    return new Promise( resolve => {

        var scssOptions = {
            outputStyle: 'expanded',
            indentType: 'tab',
            indentWidth: 1,
            precision: 6,
            sourceComments: false
        };
    
        src(conf.paths.scss.src, { sourcemaps: true })
            .pipe(plumber({ errorHandler: onError }))
            // .pipe(gCached('css'))
            .pipe(scss(scssOptions))
            // .pipe(concat('style.css'))      // 컴파일 된 일반 CSS 
            // .pipe(autoprefixer())
            // .pipe(dest('css/'))
            .pipe(minifyCSS())
            .pipe(autoprefixer())
            .pipe(concat('style.min.css'))  // 컴파일 된 압축 CSS 
            .pipe(plumber.stop())
            .pipe(dest(conf.paths.scss.dist, { sourcemaps: true }))

        resolve();
    });
}

function js() {
    return src(conf.paths.js.src, { sourcemaps: true })
        .pipe(plumber({ errorHandler: onError }))   
        .pipe(jshint())
        .pipe(jshint.reporter('default'))
        .pipe(minifyJS({
            ext: {
                // src: '-debug.js',
                min: '.js'
            }
        }))
        .pipe(concat('ui.js'))
        .pipe(plumber.stop())
        .pipe(dest(conf.paths.js.dist));
}

function lib() {
    return src('./src/lib/**/*', { sourcemaps: true })
        .pipe(plumber({ errorHandler: onError }))   
        // .pipe(concat('lib.min.js'))
        .pipe(plumber.stop())
        .pipe(dest(conf.paths.lib.dist));
}

function img() {
    return src([conf.paths.img.src, '!./src/img/sprite/**/*'])
        .pipe(dest(conf.paths.img.dist));
}

function sprite() {
    var spriteData = src('./src/img/sprite/**/*').pipe(
        spritesmith({
            imgName: 'sprite.png',
            cssName: '_sprite.scss',
            padding: 4,
        })
    );

    var imgStream = spriteData.img.pipe(dest('./dist/img/sprite'));
    var cssStream = spriteData.css.pipe(dest('./src/sass/vendor'));

    return merge(imgStream, cssStream);
}

function clean() {
    return new Promise(resolve => {
        del(['./dist/js/*'])    
        del(['./dist/css/*'])
        del(['./dist/html/*'])
        // del(['./dist/html_eng/*'])
        del(['./dist/img/*'])	

        resolve();
    })
}

function watchs() {
    return new Promise(resolve => {
        watch(conf.paths.html.src, html).on('change', browserReload);
        watch(conf.paths.scss.src, css).on('change', browserReload);
        watch(conf.paths.js.src, js).on('change', browserReload);
        watch('./src/lib/**/*', lib).on('change', browserReload);
        watch(conf.paths.img.src, js).on('change', browserReload);
        watch('./src/img/sprite/**/*', lib).on('change', browserReload);

        resolve();
    });
}

function gulpBrowserSync() {
    return browserSync.init({
        startPath: '/',
        server: {
            baseDir: `${conf.paths.dist}`,
            directory: true,
            // index: 'index.html'
        },
        port: 4000,
        // open: true,
    });
}

function browserReload() {
    browserSync.reload();
}

function onError(err) {
    notify.onError({
        title: 'Gulp error in ' + err.plugin,
        message: err.toString()
    })(err);
}

exports.default = series(clean, parallel(html, css, js, lib, img, sprite, watchs, gulpBrowserSync));

/**
 * Created by user on 25/01/2017.
 */

const gulp = require('gulp');
// const path = require('path');
const fs = require('fs');
const sourcemaps = require("gulp-sourcemaps");

const nodemon = require('nodemon');
const mocha = require('gulp-mocha');

const babel = require('babel-core/register');


// generic
var defaultConfig = {
    module: {
        loaders: [
            {test: /\.js$/, exclude: /node_modules/, loaders: ['babel'] },
        ]
    }
};

if(process.env.NODE_ENV !== 'production') {
    //defaultConfig.devtool = '#eval-source-map';
    defaultConfig.devtool = 'source-map';
    defaultConfig.debug = true;
}


// tasks

gulp.task('mocha', function() {
    return gulp.src(['./src/!**!/!*.spec.js'])
        .pipe(mocha({
            compilers: {
                js: babel
            }
        }));
});

gulp.task('tests', ['mocha']);


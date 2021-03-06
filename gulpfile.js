// Load plugins
var gulp = require('gulp');
var autoprefixer = require('gulp-autoprefixer');
var plumber = require('gulp-plumber');
var notifier = require('node-notifier');
var ts = require('gulp-typescript');
var mocha = require('gulp-mocha');
var merge = require('merge2');
var sourcemaps = require('gulp-sourcemaps');

var tsProject = ts.createProject('tsconfig.json');

// TypeScript - compile TypeScript to JS.
gulp.task('typescript', function() {
	var tsResult = gulp.src([
			'src/**/*.ts'
		])
		.pipe(sourcemaps.init())
		/*
		.pipe(plumber({
			errorHandler: function (err) {
				notifier.notify({
					title: 'Error in TypeScript task',
					message: err.message
				});

				this.emit('end');
			}
		}))
		*/
		.pipe(ts(tsProject));
		/*
		.on('end', function() {
			notifier.notify({
				title: 'TypeScript task completed',
				message: 'Success'
			});
		});
		*/
		
	return merge([
		tsResult.dts.pipe(gulp.dest('lib')),
		tsResult.js
			.pipe(sourcemaps.write('../lib'))
			.pipe(gulp.dest('lib'))
	]);
});

gulp.task('mocha', function() {
	return gulp.src([
		'tests/potd-tests.js'
	])
	.pipe(mocha());
});
 
// Watch - watcher for changes in js files: 'gulp watch' will run these tasks.
gulp.task('watch', function() {
	// Watch .js files
	gulp.watch('src/**/*.ts', ['typescript']);
	gulp.watch(['tests/*.js', 'lib/potd.js'], ['mocha']);
});

// Default - runs the scripts, styles and watch tasks: 'gulp' will run this task.
gulp.task('default', ['typescript', 'watch'])

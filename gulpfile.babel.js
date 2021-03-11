"use strict";

import webpack from "webpack";
import webpackStream from "webpack-stream";
import gulp from "gulp";
import gulpif from "gulp-if";
import browsersync from "browser-sync";
import autoprefixer from "gulp-autoprefixer";
import sass from "gulp-sass";
import groupmediaqueries from "gulp-group-css-media-queries";
import mincss from "gulp-clean-css";
import sourcemaps from "gulp-sourcemaps";
import rename from "gulp-rename";
import imagemin from "gulp-imagemin";
import imageminZopfli from "imagemin-zopfli";
import imageminMozjpeg from "imagemin-mozjpeg";
import imageminGiflossy from "imagemin-giflossy";
import imageminWebp from "imagemin-webp";
import webp from "gulp-webp";
import replace from "gulp-replace";
import rigger from "gulp-rigger";
import plumber from "gulp-plumber";
import debug from "gulp-debug";
import clean from "gulp-clean";
import yargs from "yargs";
import svgSprite from "gulp-svg-sprite";

const webpackConfig = require("./webpack.config.js"),
	argv = yargs.argv,
	production = !!argv.production,

	paths = {
		views: {
			src: [
				"./src/views/*.html"
			],
			dist: "./dist/",
			watch: "./src/**/*.html"
		},
		styles: {
			src: "./src/styles/main.scss",
			dist: "./dist/styles/",
			watch: [
				"./src/styles/**/*.scss"
			]
		},
		scripts: {
			src: "./src/js/index.js",
			dist: "./dist/js/",
			watch: [
				"./src/js/**/*.js"
			]
		},
        vendor: {
            src: "./src/vendor/**/*",
            dist: "./dist/vendor/",
            watch: [
                "./src/vendor/**/*"
            ]
        },
		images: {
			src: [
				"./src/img/**/*.{jpg,jpeg,png,gif,svg,ico}",
				"./src/img/icons/**/*",
				"!./src/img/favicon.{jpg,jpeg,png,gif}"
			],
			dist: "./dist/img/",
			watch: "./src/img/**/*.{jpg,jpeg,png,gif,svg}"
		},
		webp: {
			src: "./src/img/**/*_webp.{jpg,jpeg,png}",
			dist: "./dist/img/",
			watch: "./src/img/**/*_webp.{jpg,jpeg,png}"
		},
		fonts: {
			src: "./src/fonts/**/*.{ttf,otf,woff,woff2}",
			dist: "./dist/fonts/",
			watch: "./src/fonts/**/*.{ttf,otf,woff,woff2}"
		},
        svg: {
            src: "./src/img/svg/*.svg",
            dist: "./src/img/"
        }
	};

webpackConfig.mode = production ? "production" : "development";
webpackConfig.devtool = production ? false : "cheap-eval-source-map";

export const server = () => {
	browsersync.init({
		server: "./dist/",
        host: 'localhost',
		tunnel: false,
		notify: true,
        port: 3000
	});

	gulp.watch(paths.views.watch, views);
	gulp.watch(paths.styles.watch, styles);
	gulp.watch(paths.scripts.watch, scripts);
  gulp.watch(paths.vendor.watch, vendor);
	gulp.watch(paths.images.watch, images);
	gulp.watch(paths.webp.watch, webpimages);
};

export const cleanFiles = () => gulp.src("../theme/*", {read: false})
	.pipe(clean())
	.pipe(debug({
		"title": "Cleaning..."
	}));

export const views = () => gulp.src(paths.views.src)
	.pipe(rigger())
	.pipe(gulpif(production, replace("main.css", "main.min.css")))
	.pipe(gulpif(production, replace("main.js", "main.min.js")))
	.pipe(gulp.dest(paths.views.dist))
	.pipe(debug({
		"title": "HTML files"
	}))
	.on("end", browsersync.reload);

export const styles = () => gulp.src(paths.styles.src)
	.pipe(gulpif(!production, sourcemaps.init()))
	.pipe(plumber())
	.pipe(sass())
	.pipe(groupmediaqueries())
	.pipe(autoprefixer({
		browsers: ["last 12 versions", "> 1%", "ie 8", "ie 7"]
	}))
	.pipe(gulpif(production, mincss({
		compatibility: "ie8", level: {
			1: {
				specialComments: 0,
				removeEmpty: true,
				removeWhitespace: true
			},
			2: {
				mergeMedia: true,
				removeEmpty: true,
				removeDuplicateFontRules: true,
				removeDuplicateMediaBlocks: true,
				removeDuplicateRules: true,
				removeUnusedAtRules: false
			}
		}
	})))
	.pipe(gulpif(production, rename({
		suffix: ".min"
	})))
	.pipe(plumber.stop())
	.pipe(gulpif(!production, sourcemaps.write("./maps/")))
	.pipe(gulp.dest(paths.styles.dist))
	.pipe(debug({
		"title": "CSS files"
	}))
	.pipe(browsersync.stream());

export const scripts = () => gulp.src(paths.scripts.src)
	.pipe(webpackStream(webpackConfig), webpack)
	.pipe(gulpif(production, rename({
		suffix: ".min"
	})))
	.pipe(gulp.dest(paths.scripts.dist))
	.pipe(debug({
		"title": "JS files"
	}))
.on("end", browsersync.reload);

export const vendor = () => gulp.src(paths.vendor.src)
  .pipe(gulp.dest(paths.vendor.dist))
  .pipe(debug({
    "title": "Vendor files"
  }))
.on("end", browsersync.reload);


export const images = () => gulp.src(paths.images.src)
	.pipe(gulpif(production, imagemin([
		imageminGiflossy({
        optimizationLevel: 3,
        optimize: 3,
        lossy: 2
    }),
		imageminZopfli({
			more: true
		}),
		imageminMozjpeg({
			progressive: true,
			quality: 80
		}),
		imagemin.svgo({
			plugins: [
				{ removeViewBox: false },
				{ removeUnusedNS: false },
				{ removeUselessStrokeAndFill: false },
				{ cleanupIDs: false },
				{ removeComments: true },
				{ removeEmptyAttrs: true },
				{ removeEmptyText: true },
				{ collapseGroups: true }
			]
		})
	])))
	.pipe(gulp.dest(paths.images.dist))
	.pipe(debug({
		"title": "Images"
	}))
	.on("end", browsersync.reload);

export const svgSpriteBuild = () => gulp.src(paths.svg.src)
    .pipe(svgSprite({
            mode: {
                stack: {
                    sprite: "sprite.svg"  //sprite file name
                },
                prefix: 's'
            },
        }
    ))
    .pipe(gulp.dest(paths.svg.dist));

export const webpimages = () => gulp.src(paths.webp.src)
	.pipe(webp(gulpif(production, imageminWebp({
		lossless: true,
		quality: 90,
		alphaQuality: 90
	}))))
	.pipe(gulp.dest(paths.webp.dist))
	.pipe(debug({
		"title": "WebP images"
	}));

export const fonts = () => gulp.src(paths.fonts.src)
	.pipe(gulp.dest(paths.fonts.dist))
	.pipe(debug({
		"title": "Fonts"
	}));

export const development = gulp.series(cleanFiles,
	gulp.parallel(views, styles, scripts, vendor, images, webpimages, fonts),
	gulp.parallel(server));

export const prod = gulp.series(cleanFiles, views, styles, scripts, vendor, images, webpimages, fonts);

export default development;

'use strict';

const express = require('express'),
	  stylusMiddleware = require('stylus').middleware,
	  _ = require('lodash'),
	  path = require('path');

module.exports = function (app,options) {
	// the stylus option can be a single path, or array of paths
	// when set, we configure the node-stylus middleware

	var stylusPaths = options.paths,
		stylusOptions = {};

	for (var key in options) {
		if (key !== "paths") {
			stylusOptions[key] = options[key];
		}
	}

	if (typeof stylusPaths === 'string') {
		stylusPaths = [stylusPaths];
	}

	if (Array.isArray(stylusPaths)) {

		var outputStyle = (app.get("env") === 'production' ? 'compressed' : 'nested');
		stylusPaths.forEach(function (stylusPath) {
			app.use(stylusMiddleware(_.extend({
				src: path.join(app.get("basedir"),stylusPath),
				dest: path.join(app.get("basedir"),stylusPath),
				outputStyle: outputStyle,
			},stylusOptions)));
		});
	}
};

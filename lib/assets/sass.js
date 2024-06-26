'use strict';

const express = require('express'),
	  ///sassMiddleware = require('node-sass-middleware'), //TODO:lwf
	  sass = require("sass"),
	  sassMiddleware = function() {

	  },
	  _ = require('lodash'),
	  path = require('path');

module.exports = function (app,options) {
	// the sass option can be a single path, or array of paths
	// when set, we configure the node-sass middleware

	var sassPaths = options.paths,
		sassOptions = {};

	for (var key in options) {
		if (key !== "paths") {
			sassOptions[key] = options[key];
		}
	}

	if (typeof sassPaths === 'string') {
		sassPaths = [sassPaths];
	}

	if (Array.isArray(sassPaths)) {

		var outputStyle = (app.get("env") === 'production' ? 'compressed' : 'nested');
		sassPaths.forEach(function (sassPath) {
			app.use(sassMiddleware(_.extend({
				src: path.join(app.get("basedir"),sassPath),
				dest: path.join(app.get("basedir"),sassPath),
				outputStyle: outputStyle,
			},sassOptions)));
		});
	}
};

'use strict';

const express = require('express'),
	  lessMiddleware = require('less-middleware'),
	  _ = require('lodash'),
	  path = require('path');

module.exports = function (app,options) {
	// the less option can be a single path, or array of paths
	// when set, we configure the node-less middleware

	var lessPaths = options.paths,
		lessOptions = {};

	for (var key in options) {
		if (key !== "paths") {
			lessOptions[key] = options[key];
		}
	}

	if (typeof lessPaths === 'string') {
		lessPaths = [lessPaths];
	}

	if (Array.isArray(lessPaths)) {

		var outputStyle = (app.get("env") === 'production' ? 'compressed' : 'nested');
		lessPaths.forEach(function (lessPath) {
			app.use(lessMiddleware(path.join(app.get("basedir"),lessPath),_.extend({
					dest: path.join(app.get("basedir"),lessPath),
			},lessOptions)));
		});
	}
};

'use strict';

const express = require('express'),
    bodyParser = require('body-parser');


module.exports = function(app,options) {
	if (options.urlencoded) {
    	app.use(bodyParser.urlencoded({ extended: true }));
	}
	if (options.json) {
    	app.use(bodyParser.json());
	}
};

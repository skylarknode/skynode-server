'use strict';

const express = require('express'),
    path = require('path');

module.exports = function(app, custom) {
    if (custom) {
    	try {
	        require(path.join(app.get("basedir"), custom))(app);
    	} catch(e) {
    		console.error(e);
    		throw e;
    	}
    }
};
'use strict';

const express = require('express'),
    path = require('path');

module.exports = function(app, custom) {
    if (custom) {
    	var dispatcher = custom.dispatcher || custom;
    	try {
	        require(path.join(app.get("root"), dispatcher))(app,custom);
    	} catch(e) {
    		console.error(e);
    		throw e;
    	}
    }
};
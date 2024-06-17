'use strict';

const express = require('express'),
      path = require('path');

module.exports = function(app,modulePath) {
    if (modulePath) {
    	try {
    	    require(path.join(app.get("basedir"),modulePath))(app);
    	} catch(e) {
    		console.error(e);
    		throw e;
    	}
    }    
};

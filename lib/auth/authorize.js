'use strict';

const express = require('express'),
      path = require('path');

module.exports = function(app,modulePath) {
    if (modulePath) {
    	try {
    	    require(path.join(app.get("root"),modulePath))(app);
    	} catch(e) {
    		console.error(e);
    		throw e;
    	}
    }    
};

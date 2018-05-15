'use strict';

const express = require('express'),
      path = require('path');

module.exports = function(app,modulePath) {
    if (modulePath) {
        require(path.join(app.get("root"),modulePath))(app);
    }    
};

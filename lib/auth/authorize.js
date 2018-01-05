'use strict';

const express = require('express'),
      path = require('path');

module.exports = function(app,options) {
    if (options) {
        require(path.join(app.get("root"),options))(app);
    }    
};

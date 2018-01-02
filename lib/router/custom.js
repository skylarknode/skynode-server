'use strict';

const express = require('express'),
      path = require('path');

module.exports = function(app,custom) {
    if (custom) {
        require(path.join(app.get("root"),custom))(app);
    }    
};

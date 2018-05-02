'use strict';

const express = require('express'),
      cookieParser = require('cookie-parser');


module.exports = function(app,options) {
    app.use(cookieParser());
};

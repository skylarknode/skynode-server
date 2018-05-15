'use strict';

const express = require('express'),
      methodOverride = require('method-override');


module.exports = function(app) {
    app.use(methodOverride('X-HTTP-Method-Override'));	
};

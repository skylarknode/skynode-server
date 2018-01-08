'use strict';
const express = require('express');

module.exports = function(app,options) {
  app.use(function (req, res, next) {
      req.ajax = req.xhr; // legacy code
      next();
  });

};

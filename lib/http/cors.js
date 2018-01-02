'use strict';
const express = require('express'),
	  cors = require('cors');

module.exports = function(app,options) {
  app.use(function (req, res, next) {
      var headers = req.header('Access-Control-Request-Headers');
      var origin = req.header('Origin');

      // TODO should this check if the request is via the API?
      if (req.method === 'OPTIONS' || (req.method === 'GET' && req.headers.origin)) {
        res.header({
          'Access-Control-Allow-Origin':  origin,
          'Access-Control-Allow-Headers': headers,
          'Access-Control-Allow-Credentials': 'true'
        });
        req.cors = true;
      }

      if (req.method === 'OPTIONS') {
        res.send(204);
      } else {
        next();
      }
  });

};

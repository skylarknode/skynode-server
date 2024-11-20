'use strict';
const express = require('express'),
	  cors = require('cors');

module.exports = function(app,options) {
  app.use(function (req, res, next) {
      var headers = req.header('Access-Control-Request-Headers');
      var origin = req.header('Origin');
      console.log('origin:'+origin);
      console.log('req.headers.origin:'+req.headers.origin);
      console.dir(options);

      // TODO should this check if the request is via the API?
//      if (req.method === 'OPTIONS' || (req.method === 'GET' && req.headers.origin)) {
      if (req.method === 'OPTIONS' || (req.headers.origin)) {
        res.header({
//          'Access-Control-Allow-Origin':  origin,
          'Access-Control-Allow-Origin':  options.allows.origins.includes(origin)?origin:"",
//          'Access-Control-Allow-Headers': "*,x-return-to,x-csrf-token,X-Csrf-Token",
          'Access-Control-Allow-Headers': options.allows.headers.join(","),
//          'Access-Control-Allow-Methods': "*",
          'Access-Control-Allow-Methods': options.allows.methods.join(","),
          'Access-Control-Allow-Credentials': 'true',
//          'Access-Control-Expose-Headers': "X-Redirect"
          'Access-Control-Expose-Headers': options.exposes.headers.join(",")
        });
        req.cors = true;
      }

      if (req.method === 'OPTIONS') {
        console.log('req.method:'+req.method);
        res.send(204);
      } else {
        next();
      }
  });

};

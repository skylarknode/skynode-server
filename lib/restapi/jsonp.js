'use strict';
const express = require('express');

module.exports = function(app,options) {
  app.use(function (req, res, next) {
      var _send = res.send;
      res.send = function (body) {
        var callback = req.params.callback,
            isJSONP  = res.get('Content-Type') === 'application/json' && callback;

        if (body && req.method !== 'HEAD' && isJSONP) {
          res.contentType('js');
          body = callback + '(' + body.toString().trim() + ');';
        }
        _send.call(this, body);
      };
      next();
  });
};

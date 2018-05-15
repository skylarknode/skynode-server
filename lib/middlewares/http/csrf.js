'use strict';
const express = require('express'),
    csurf = require('csurf'),
    parse = require('url').parse;

module.exports = function(app, options) {
    var ignore = options.ignore || [],
        csrf = csurf(options),
        always = { OPTIONS: 1, GET: 1, HEAD: 1 };

    app.use(function(req, res, next) {
        if (always[req.method]) {
            return csrf(req, res, next);
        } else {
            var url = parse(req.url);
            var skipCSRF = false;
            ignore.forEach(function(matcher) {
                if (typeof matcher === 'string') {
                    if (matcher === url.pathname) {
                        skipCSRF = true;
                    }
                } else {
                    // regular expression matcher
                    if (url.pathname.match(matcher)) {
                        skipCSRF = true;
                    }
                }
            });

            if (skipCSRF) {
                next();
            } else {
                return csrf(req, res, next);
            }
        }
    });
};
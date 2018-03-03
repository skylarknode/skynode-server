'use strict';

const express = require('express'),
      session = require('express-session'),
      flash = require('express-flash');

module.exports = function(app,options) {
    app.use(session(options));
    app.use(flash());
    // Session-persisted message middleware
    app.use(function(req, res, next) {
        let err = req.session.error,
            msg = req.session.notice,
            success = req.session.success;

        delete req.session.error;
        delete req.session.success;
        delete req.session.notice;

        res.locals.sessionFlash = req.session.sessionFlash;

        delete req.session.sessionFlash;

        if (err) res.locals.error = err;
        if (msg) res.locals.notice = msg;
        if (success) res.locals.success = success;

        next();
    });
};

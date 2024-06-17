'use strict';

var hamljs = require('hamljs'),
    utils = require("../utils"),
    path = require('path');


module.exports = function(app, options) {
    var viewsDir = options.viewsDir,
        partialsDir = options.partialsDir;
    if (viewsDir) {
        if (typeof viewsDir == "string") {
            viewsDir = path.join(app.get("basedir"), viewsDir);
        } else {
            for (var i = 0; i < viewsDir.length; i++) {
                viewsDir[i] = path.join(app.get("basedir"), viewsDir[i]);
            }
        }

    }
    if (partialsDir) {
        if (typeof partialsDir == "string") {
            partialsDir = path.join(app.get("basedir"), partialsDir);
        } else {
            for (var i = 0; i < partialsDir.length; i++) {
                partialsDir[i] = path.join(app.get("basedir"), partialsDir[i]);
            }
        }

    }

    app.set('views', viewsDir);
    app.set('view cache', options.cache || false);
    app.set('view engine', options.extname);
    app.engine(options.extname, function(str, options, fn) {
        options.locals = utils.extend({}, options)
            //debug('template locals', options.locals)
        return hamljs.renderFile(str, 'utf-8', options, fn)
    });
};
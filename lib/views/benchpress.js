'use strict';

var Benchpress = require('benchpressjs'),
    utils = require("../utils"),
    async = require('async'),
    path = require('path'),
    fs = require('fs');
 

module.exports = function(app, options) {
    var viewsDir = options.viewsDir ,partialsDir = options.partialsDir;
    if (viewsDir) {
        if (typeof viewsDir == "string") {
            viewsDir = path.join(app.get("root") , viewsDir);
        } else {
            for (var i =0;i<viewsDir.length;i++) {
                viewsDir[i] = path.join(app.get("root") , viewsDir[i]);
            }
        }
        
    }
    if (partialsDir) {
        if (typeof partialsDir == "string") {
            partialsDir = path.join(app.get("root") , partialsDir);
        } else {
            for (var i =0;i<partialsDir.length;i++) {
                partialsDir[i] = path.join(app.get("root") , partialsDir[i]);
            }
        }

    }

    app.set('views', viewsDir);
    app.set('view cache', options.cache || false);
    app.set('view engine', options.extname);
    app.engine(options.extname,  function(filepath, data, next) {
        filepath = filepath.replace(/\.tpl$/, '.js');

        templatesOnDemand({
            filePath: filepath,
        }, null, function (err) {
            if (err) {
                return next(err);
            }

            Benchpress.__express(filepath, data, next);
        });
    });

    app.set('json spaces', app.get('env')  === 'development' ? 4 : 0);

    var workingCache = {};

    function templatesOnDemand(req, res, next) {
        var filePath = req.filePath || path.join(viewsDir, req.path);
        if (!filePath.endsWith('.js')) {
            return next();
        }
        var tplPath = filePath.replace(/\.js$/, '.tpl');
        if (workingCache[filePath]) {
            workingCache[filePath].push(next);
            return;
        }

        async.waterfall([
            function (cb) {
                file.exists(filePath, cb);
            },
            function (exists, cb) {
                if (exists) {
                    return next();
                }

                // need to check here again
                // because compilation could have started since last check
                if (workingCache[filePath]) {
                    workingCache[filePath].push(next);
                    return;
                }

                workingCache[filePath] = [next];
                fs.readFile(tplPath, 'utf8', cb);
            },
            function (source, cb) {
                Benchpress.precompile({
                    source: source,
                    minify: req.app.get('env') !== 'development',
                }, cb);
            },
            function (compiled, cb) {
                if (!compiled) {
                    return cb(new Error('[[error:templatesOnDemand.compiled-template-empty, ' + tplPath + ']]'));
                }
                fs.writeFile(filePath, compiled, cb);
            },
        ], function (err) {
            var arr = workingCache[filePath];
            workingCache[filePath] = null;

            arr.forEach(function (callback) {
                callback(err);
            });
        });
    };

};
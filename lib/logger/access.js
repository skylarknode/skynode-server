'use strict';

var morgan = require('morgan'),
    rfs = require('rotating-file-stream'),
    path = require('path');

module.exports = function(app,options) {
    var isProd = app.get('is_production'),
        option;

    if (options.prod && isProd) {
      option = options.prod;
    } else if (options.dev && !isProd) {
      option = options.dev;
    }

    if (option) {
      var args = {};
      if (option.logfile) {
        args.stream = rfs.createStream(options.logfile, {
            interval: options.rotating,
            path: path.join(app.get("basedir"),options.logdir)
        });
      }
      app.use(morgan(option.format,args));
    }

};

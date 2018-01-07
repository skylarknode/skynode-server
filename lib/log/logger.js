'use strict';

var morgan = require('morgan'),
    rfs = require('rotating-file-stream'),
    path = require('path');

module.exports = function(app,options) {
  for (var type in options) {
    if (type==="access") {
      var accessLogStream = rfs(options[type].logfile, {
          interval: options[type].rotating,
          path: path.join(app.get("root"),options[type].logdir)
      });

      app.use(morgan("combined",{
        stream: accessLogStream
      }));
    }  else {
      app.use(morgan(type));
    }    
  }
};

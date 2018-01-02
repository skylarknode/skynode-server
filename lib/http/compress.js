'use strict';

var compress = require('compression');

module.exports = function(app,options) {
  app.use(compress(options));
};

'use strict';

module.exports = function(app,options) {
  app.use(function(req, res, next) {
  	for (var key in options) {
    	res.setHeader(key, options[key]);
	}
    next();
  });
};

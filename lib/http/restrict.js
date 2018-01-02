'use strict';

const express = require('express'),
    bodyParser = require('body-parser');


// Parse a string representing a file size and convert it into bytes.
// A number on it's own will be assumed to be bytes. A multiple such as
// "k" or "m" can be appended to the string to handle larger numbers. This
// is case insensitive and uses powers of 1024 rather than (1000).
// So both 1kB and 1kb == 1024.
var powers = { k: 1, m: 2, g: 3, t: 4 },
    regexp = /^(\d+(?:.\d+)?)\s*([kmgt]?)b?$/;
function parseLimit(string) {
  var matches = ('' + string).toLowerCase().match(regexp),
      bytes = null, power;

  if (matches) {
    bytes = parseFloat(matches[1]);
    power = powers[matches[2]];

    if (bytes && power) {
      bytes = Math.pow(bytes * 1024, power);
    }
  }

  return bytes || null;
}

module.exports = function(app,options) {
	if (options["max-request-size"]) {
    	var limit  = parseLimit(["max-request-size"]);

    	app.use(function (req, res, next) {
      		if (limit) {
        		var contentLength = parseInt(req.header('Content-Length', 0), 10),
            	message = 'Sorry, the content you have uploaded is larger than JS Bin can handle. Max size is ' + limit;

        		if (limit && contentLength > limit) {
          			return next(new errors.RequestEntityTooLarge(message));
        		}
      		}
      		next();
    	});
	}
};

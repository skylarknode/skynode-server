'use strict';

var express = require('express'),
    hbs = require('express-hbs'),
    moment = require('moment'),
    path = require('path');

module.exports = function(app, options) {
    if (app.get("env") !== app.PRODUCTION) {
      var hbsutils = require('hbs-utils')(hbs);
      hbsutils.registerWatchedPartials(path.resolve(app.get("root") + options.partialsDir));
    }

    hbs.registerHelper('bust', function() {
        return (Math.random() * 1e5 | 0).toString(16);
    });

    hbs.registerHelper('eachkey', function eachKey(object) {
        var options = arguments[arguments.length - 1];
        var ret = '';
        for (var key in object) {
            if (object.hasOwnProperty(key)) {
                ret += options.fn({
                    key: key,
                    value: object[key]
                });
            }
        }
        return ret;
    });

    hbs.registerHelper('encodeURIComponent', function(options) {
        return encodeURIComponent(options.fn(this));
    });

    hbs.registerHelper('makeURL', function(url, statik) {
        if (url.indexOf('http') === 0) {
            return url;
        } else {
            return statik + '/' + url;
        }
    });

    hbs.registerHelper('stripeTimestampAsDate', function(timestamp, format, options) {
        return moment(timestamp * 1000).format(format);
    });

    hbs.registerHelper('moment', function(date, format) {
        return moment(date).format(format);
    })

    hbs.registerHelper('divide', function(x, y, dp, options) {
        return (x / y).toFixed(dp) + options.fn(this);
    });

    hbs.registerHelper('amountPaid', function(invoice) {
        return invoice.total - invoice.amount_due;
    });

    hbs.registerHelper('percent', function(total, percent, dp) {
        return ((total / 100) * (percent / 100)).toFixed(dp);
    });

    hbs.registerHelper('equal', function(lvalue, rvalue, options) {
        if (arguments.length < 3) {
            return false;
        }
        if (lvalue !== rvalue) {
            return options.inverse(this);
        } else {
            return options.fn(this);
        }
    });

    hbs.registerHelper('if_null', function(a, opts) {
        if (a === null) {
            return opts.fn(this);
        } else {
            return opts.inverse(this);
        }
    });

    hbs.registerHelper('if_all', function() { // important: not an arrow fn
        var args = [].slice.call(arguments);
        var opts = args.pop();

        return args.every(function(v) { return !!v; }) ?
            opts.fn(this) :
            opts.inverse(this);
    });

    hbs.registerHelper('dump', function(obj, def) {
        return JSON.stringify(obj || def || {}, null, 2);
    });

    hbs.registerHelper('feature', function(request, flag, options) {
      if (app.features && app.features(flag, request)) {
        return options.fn(this);
      } else if (options.inverse) {
        return options.inverse(this);
      }
    });

    app.set('views', path.join(app.get("root"), options.viewsDir));
    app.set('view engine', options.extname);
    app.engine(options.extname, hbs.express3({
        extname: options.extname,
        partialsDir: [path.join(app.get("root"), options.partialsDir)],
    }));
};
'use strict';

const express = require('express'),
    nodemailer  = require('nodemailer'),
    _ = require('lodash'),
    fs = require('fs'),

    path = require('path');


function SkyServer(app) {
    this._app = app || express();
}

SkyServer.prototype.init = function(config) {
    var app = this._app;

    app.PRODUCTION  = 'production';
    app.DEVELOPMENT = 'development';

    app.set("config", config);
    app.emit('before:init', app);


    app.mailer = (function (cfg) {
        if (cfg) {
            return require("./email").createMailer(cfg.setting,cfg.smtp);
        } 
    })(config.mail);

    app.store = (function (options,cfg) {
        if (options) {
            var stores = require("./stores"),
                store = stores.create(options,cfg);
            store.setup = stores.setup;
            return store;
        } 
    })(config.store,config);

    app.models = {};

    app.set("port", config.port);
    app.set("host", config.host);
    var url = config.system.url,
        fullUrl,
        host,
        prefix,
        ssl = false;
    if (typeof url === "string") {
        var parsedUrl = require('url').parse(url, true, true);
        ssl = parsedUrl.protocol == "https";
        host = parsedUrl.hostname;
        if (parsedUrl.port) {
            host = host + ":" + parsedUrl.port; 
        }
        prefix = parsedUrl.pathname;
    } else {
        host = url.host;
        prefix = url.prefix,
        ssl = url.ssl;
    }

    require("./features")(app);

// Define some global template variables.
var helpers = require('./helpers').createHelpers(app);
app.locals.version = app.get('version');
app.locals.client = app.get('client');
Object.keys(helpers).forEach(function (key) {
  app.locals[key] = helpers[key];
});
app.helpers = helpers;

// set these as global template variables since they keep getting missed
app.locals.is_production = app.get('is_production');
//app.locals.cachebust = app.locals.cacheBust = app.get('is_production') ? '?' + app.get('version') : '';
app.locals.cachebust = '';


    // Strip trailing slash from the prefix
    prefix = prefix.replace(/\/$/, '');
    fullUrl = (ssl?'https://' : 'http://') + host + prefix;

    app.set('url host', host);
    app.set('url prefix', prefix);
    app.set('url ssl', ssl);
    app.set('basepath', prefix);
    app.set("url full", fullUrl);

    app.set("root", config.root);

    try {
        app.set('version', require(path.join(config.root,'package')).version);
    } catch (e) {
        
    }

    app.set('env',config.env);

    process.env.NODE_ENV = config.env;
    app.set('is_production', process.env.NODE_ENV === app.PRODUCTION);

    app.emit('before:init:loggerplugin', app);
    this._initLoggerPlugin(app,config.logger);

    // favicon
    if (config.system.favicon) {
        app.use(require('serve-favicon')(path.join(app.get("root"),config.system.favicon)));
    }

    if (config.system["private"]){
        app.use(require('express-basic-auth')(config.system["private"]));    
    }
    app.use(function(req, res, next) {
        // used for timings
        req.start = Date.now();
        next();
    });


    app.emit('before:init:middlewares', app);
    this._initMiddlewares(app, config.middlewares);

    app.emit('before:init:auth', app);
    this._initAuthPlugin(app, config.auth);

    app.emit('before:init:assetsplugin', app);
    this._initAssetsPlugin(app, config.assets);

    app.emit('before:init:viewsengine', app);
    this._initViewsEngine(app, config.views);

    app.emit('before:init:router', app);
    this._initRouter(app, config.router);

    app.emit('before:init:erroringplugin', app);
    this._initErroringPlugin(app,config.erroring);

};

SkyServer.prototype._initLoggerPlugin = function(app, option) {
    if (option) {
        require('./log/logger')(app, option);
    }
};

SkyServer.prototype._initMiddlewares = function(app, middlewares) {
  function initHttp(app, http) {
    if (http.compress) {
        require('./middlewares/http/compress')(app, http.compress);
    }

    if (http.bodyParser) {
        require('./middlewares/http/bodyParser')(app, http.bodyParser);
    }

    if (http.cookie) {
        require('./middlewares/http/cookie')(app, http.cookie);
    }

    if (http.flash) {
        require('./middlewares/http/flash')(app, http.flash);
    }

    if (http.rest) {
        require('./middlewares/http/rest')(app, http.rest);
    }

    if (http.session) {
        require('./middlewares/http/session')(app, http.session);
    }

    if (http.header) {
        require('./middlewares/http/header')(app, http.header);
    }

    if (http.csrf) {
        require('./middlewares/http/csrf')(app, http.csrf);
    }

    if (http.restrict) {
        require('./middlewares/http/restrict')(app, http.restrict);
    }
  }

  function initRestApi(app, rests) {
    if (rests.cors) {
        require('./middlewares/restapi/cors')(app, rests.cors);
    }
    if (rests.jsonp) {
        require('./middlewares/restapi/jsonp')(app, rests.jsonp);
    }
    if (rests.ajax) {
        require('./middlewares/restapi/ajax')(app, rests.ajax);
    }
  }

  initHttp(app,middlewares.http);

  initRestApi(app,middlewares.restapi);

  if (middlewares.custom) {
        require('./middlewares/custom')(app, middlewares.custom);
  }

};


SkyServer.prototype._initAuthPlugin = function(app, option) {
    if (option) {
        require('./auth/authorize')(app, option);
    }
};

SkyServer.prototype._initAssetsPlugin = function(app, assets) {
    if (assets.less) {
        require('./assets/less')(app, assets.less);
    }

    if (assets.sass) {
        require('./assets/sass')(app, assets.sass);
    }

    if (assets.stylus) {
        require('./assets/stylus')(app, assets.stylus);
    }
}

SkyServer.prototype._initErroringPlugin = function(app, option) {
    if (option) {
        require('./error/erroring')(app, option);
    }
};

SkyServer.prototype._initViewsEngine = function(app, views) {
    if (views.handlebars) {
        require('./views/handlebars')(app, views.handlebars);
    }
    if (views.haml) {
        require('./views/haml')(app, views.haml);
    }
};
SkyServer.prototype._initRouter = function(app, router) {
    if (router.slaxes) {
        require('./router/slaxes')(app, router.slaxes);
    }

    if (router.statics) {
        require('./router/statics')(app, router.statics);
    }

    if (router.custom) {
        require('./router/custom')(app, router.custom);
    }

};

/**
Start listening on the given host:port
@param callback {Function}    the function to call once the server is ready
*/
SkyServer.prototype.start = function(callback) {
    if (this._server) {
        console.warn("The server is  started!");
        return;
    }

    var app = this._app,
        config = app.get("config"),
        args = [];
    args.push(config.port);
    if (config.host) {
        args.push(config.host);
    }
    args.push(function() {
        callback && callback();
    });

    this._server = this._app.listen.apply(this._app, args);

    if (typeof callback === 'function') {
        callback();
    }
    app.emit('started');

    console.log('This server' + ' is up and running on port ' + app.get('port') + '. Now point your browser at ' + app.get('url full') + '\n');

}

/**
Stop listening
*/
SkyServer.prototype.stop = function stop() {
    if (this._server) {
        this._server.close();
        this._server = null;
    }
}


module.exports = SkyServer;
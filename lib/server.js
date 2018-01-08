'use strict';

const express = require('express'),
    _ = require('lodash'),
    fs = require('fs'),
    path = require('path'),
    existsSync = fs.existsSync || path.existsSync;// yeah folks, have some of that.


function deepExtend(target, object) {
    Object.getOwnPropertyNames(object).forEach(function(key) {
        var value = object[key];

        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            target[key] = deepExtend(target[key] || {}, value);
        } else {
            target[key] = value;
        }
    });
    return target;
}

function SkyServer(app) {
    this._app = app || express();
}

SkyServer.prototype.init = function(config) {
    var app = this._app;

    app.PRODUCTION  = 'production';
    app.DEVELOPMENT = 'development';

    app.set("config", config);
    app.emit('before:init', app);



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

    // Strip trailing slash from the prefix
    prefix = prefix.replace(/\/$/, '');
    fullUrl = (ssl?'https://' : 'http://') + host + prefix;

    app.set('url host', host);
    app.set('url prefix', prefix);
    app.set('url ssl', ssl);
    app.set('basepath', prefix);
    app.set("url full", fullUrl);

    app.set("root", config.root);

    app.set('version', require(path.join(config.root,'package')).version);

    process.env.NODE_ENV = config.env;
    app.set('is_production', process.env.NODE_ENV === app.PRODUCTION);

    app.emit('before:init:loggerplugin', app);
    this._initLoggerPlugin(app,config.logger);

    // favicon
    if (config.system.favicon) {
        app.use(require('serve-favicon')(path.join(app.get("root"),config.system.favicon)));
    }

    app.use(function(req, res, next) {
        // used for timings
        req.start = Date.now();
        next();
    });

    app.emit('before:init:httpplugin', app);
    this._initHttpPlugin(app, config.http);

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

SkyServer.prototype._initHttpPlugin = function(app, http) {
    if (http.compress) {
        require('./http/compress')(app, http.compress);
    }

    if (http.bodyParser) {
        require('./http/bodyParser')(app, http.bodyParser);
    }

    if (http.cookie) {
        require('./http/cookie')(app, http.cookie);
    }

    if (http.rest) {
        require('./http/rest')(app, http.rest);
    }

    if (http.session) {
        require('./http/session')(app, http.session);
    }

    if (http.header) {
        require('./http/header')(app, http.header);
    }

    if (http.cors) {
        require('./http/cors')(app, http.cors);
    }

    if (http.csrf) {
        require('./http/csrf')(app, http.csrf);
    }

    if (http.restrict) {
        require('./http/restrict')(app, http.restrict);
    }
}

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


module.exports = {
    "start": function(args, ctor) {
        if (!ctor) {
            ctor = SkyServer;
        }

        var localconfig;

        if (!process.env.CONFIG && process.argv[2]) {
            process.env.CONFIG = process.argv[2];
        }

        // If a custom config is passed in, resolve its path
        if (process.env.CONFIG) {
            localconfig = path.resolve(process.cwd(), process.env.CONFIG);
        }

        if (!fs.existsSync(localconfig)) {
            // try the cwd
            localconfig = path.resolve(path.resolve(process.cwd(), 'web.json'));
        }

        console.log('Config from %s', localconfig);

        var config = require('./web.default.json');

        if (existsSync(localconfig)) {
            deepExtend(config, require(localconfig));
        }

        config.root = config.root || path.dirname(localconfig);

        var instant = new ctor();
        instant.init(config);
        instant.start();
        return instant;

    },
    "SkyServer": SkyServer
};
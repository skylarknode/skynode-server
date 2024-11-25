'use strict';

const   express = require('express'),
        nodemailer  = require('nodemailer'),
        _ = require('lodash'),
        fs = require('fs'),
        async = require('async'),
        nconf = require('nconf'),
        nfs = require("skynode-nfs"),
        slangx = require('skylark-langx'),
        path = require('path');

var winston = require('winston');


function SkyServer(params) {
    this._app = express();
    this._hooks = {};

    var self = this,
        app = this._app,
        server;


    app.PRODUCTION  = 'production';
    app.DEVELOPMENT = 'development';

    app.Router = express.Router;
    app.static = express.static;


    var nconfig = this.nconfig = new nconf.Provider();

    nconfig.use("memory");

    if (params.argv) {
        nconfig.argv();
    }

    if (params.env) {
        nconfig.env();
    }

    if (params.config){
        nconfig.add("config",{
            type : "literal",
            store : params.config
        });
        app.set("config", params.config);
    }

    if (params.defaults){
        nconfig.defaults(params.defaults);
    }


    app.nconf = function(key,value) {
        if (value === undefined) {
            return nconfig.get(key);
        } else {
            if (slangx.isPlainObject(key)) {
                slangx.each(key,function(key1,value1){
                    nconfig.set(key1,value1);
                });
            } else {
                nconfig.set(key,value);
            }
            return this;
        }
    };

    app.ncpath = function(key) {
        var value = this.nconf(key);

        if (slangx.isString(value)) {
            return path.join(this.nconf("root"),value);
        }
    }

    if (nconfig.get('ssl')) {
        server = require('https').createServer({
            key: fs.readFileSync(nconfig.get('ssl').key),
            cert: fs.readFileSync(nconfig.get('ssl').cert),
        }, app);
    } else {
        server = require('http').createServer(app);
    }

    this._server = app.webserver = server;

    server.on('error', function (err) {
        if (err.code === 'EADDRINUSE') {
            winston.error('The address in use, exiting...', err);
        } else {
            winston.error(err);
        }

        throw err;
    });

    // see https://github.com/isaacs/server-destroy/blob/master/index.js
    var connections = this._connections = {};
    server.on('connection', function (conn) {
        var key = conn.remoteAddress + ':' + conn.remotePort;
        connections[key] = conn;
        conn.on('close', function () {
            delete connections[key];
        });
    });



    var avtModPath = app.ncpath("activator");
    console.log(avtModPath);
    if (avtModPath) {
        require(avtModPath)(self);
    }

}


SkyServer.prototype.init = function(callback) {
    var self = this,
        app = this._app;


    function _init(next) {
        console.log("init.2.start");
        try {
             app.mailer = (function (cfg) {
                if (cfg) {
                    return require("./email").createMailer(cfg.setting,cfg.smtp);
                } 
            })(app.nconf("mail"));

            app.store = (function (options) {
                if (options) {
                    options.root = app.get("root");
                    var stores = require("./stores"),
                        store = stores.create(options);
                    store.setup = stores.setup;
                    return store;
                } 
            })(app.nconf("store"));

            app.models = {};
            var port = process.env.port;
            if (!port) {
                port = app.nconf("port");
            }
            app.set("port", port);
            app.set("host", app.nconf("host"));
            var url = app.nconf("system:url"),
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

            app.set("root", app.nconf("root"));

            try {
                app.set('version', require(path.join(app.get('root'),'package')).version);
            } catch (e) {
                
            }

            let cache = require('./cache')({
                cache : "memory"
            });

            app.set('cache', function getCache(namespace) {
                return new cache(namespace)
            })


            app.set('env',app.nconf('env'));

            process.env.NODE_ENV = app.nconf('env');

            app.set('is_production', process.env.NODE_ENV === app.PRODUCTION);

            app.emit('before:init:loggerplugin', app);
            self._initLoggerPlugin(app,app.nconf("logger"));

            // favicon
            if (app.nconf("system:favicon")) {
                app.use(require('serve-favicon')(app.ncpath("system:favicon")));
            }

            if (app.nconf("system:private")){
                app.use(require('./auth/private')(app.nconf("system:private")));    
            }
            app.use(function(req, res, next) {
                // used for timings
                req.start = Date.now();
                next();
            });


            app.emit('before:init:middlewares', app);
            self._initMiddlewares(app, app.nconf("middlewares"));

            app.emit('before:init:auth', app);
            self._initAuthPlugin(app, app.nconf("auth"));

            app.emit('before:init:assetsplugin', app);
            self._initAssetsPlugin(app, app.nconf("assets"));

            app.emit('before:init:viewsengine', app);
            self._initViewsEngine(app, app.nconf("views"));

            app.emit('before:init:router', app);
            self._initRouter(app, app.nconf("router"));

            app.emit('before:init:erroringplugin', app);
            //self._initErroringPlugin(app,app.nconf("erroring"));

            console.log("init.2");
                
        } catch (e) {
            consolr.error(e);
           next(e);
           return;
        }
        next();

    }  

    async.series([
        function(next) {
            console.log("init.1");
            self._fireHook("initing",{},next);
        },
        _init,
        function(next) {
            console.log("init.3");
            self._fireHook("inited",{},next);
        }    
    ],function(err){
        if (err) {
            console.error(err);
        }
        callback && callback();
    });
};

SkyServer.prototype._initLoggerPlugin = function(app, logger) {
    if (logger.access) {
        require('./logger/access')(app, logger.access);
    }

    if (logger.logging) {
        require('./logger/application' )(app, logger.application);
    }
};

SkyServer.prototype._initMiddlewares = function(app, middlewares) {
  function initHttp(app, http) {
    if (http.compress) {
        require('./middler/http/compress')(app, http.compress);
    }

    if (http.bodyParser) {
        require('./middler/http/bodyParser')(app, http.bodyParser);
    }

    if (http.cookie) {
        console.log("http.cookie");
        require('./middler/http/cookie')(app, http.cookie);
    }

    if (http.flash) {
        require('./middler/http/flash')(app, http.flash);
    }

    if (http.rest) {
        require('./middler/http/rest')(app, http.rest);
    }

    if (http.session) {
        require('./middler/http/session')(app, http.session);
    }

    if (http.header) {
        require('./middler/http/header')(app, http.header);
    }

    if (http.csrf) {
        require('./middler/http/csrf')(app, http.csrf);
    }

    if (http.restrict) {
        require('./middler/http/restrict')(app, http.restrict);
    }

    if (http.spiderDetector) {
        app.use(require('spider-detector').middleware());
    }

    if (http.useragent) {
        app.use(require('express-useragent').express());
    }
  }

  function initRestApi(app, rests) {
        console.log("rests.cors:");
        console.log(rests.cors);
    if (rests.cors) {

        require('./middler/restapi/cors')(app, rests.cors);
    }
    if (rests.jsonp) {
        require('./middler/restapi/jsonp')(app, rests.jsonp);
    }
    if (rests.ajax) {
        require('./middler/restapi/ajax')(app, rests.ajax);
    }
  }

  initRestApi(app,middlewares.restapi);

  initHttp(app,middlewares.http);


  if (middlewares.custom) {
        require('./middler/custom')(app, middlewares.custom);
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
    if (views.benchpress) {
        require('./views/benchpress')(app, views.benchpress);
    }

    if (app.get('is_production')) {
        app.enable('cache');
        app.enable('minification');
    }

};

SkyServer.prototype._initRouter = function(app, router,next) {
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
    var self = this,
        server = this._server,
        app = self._app;

    async.series([
        function(next) {
            console.log("start.1");
            self._fireHook("starting",{},next);
        },

        function(next){
            console.log("start.2");
            var  args = [];
            args.push(app.get("port"));


            if (app.get("host")) {
                args.push(app.get("host"));
            }
            args.push(next)

            app.enable('trust proxy');

            server.listen.apply(server, args);
        },

        function(next){
            console.log('This server' + ' is up and running on port ' + app.get('port') + '. Now point your browser at ' + app.get('url full') + '\n');
            self._fireHook("started",{},next)
        }
    ],function(err,result){
        if (err) {
            console.error(err);
        }
        console.log("start.4");
        callback && callback(err,result);
    });

}

/**
Stop server 
*/
SkyServer.prototype.stop = function stop() {
    if (this._server) {
        this._server.close();
        this._server = null;
    }
}


/**
Hook a plugin event
*/
SkyServer.prototype.registerHook = function registerHook(hook,callback) {
    console.log(hook);
    var self = this;
    if (slangx.isPlainObject(hook)) {
        slangx.each(hook,function(key,value){
            self.registerHook(key,value);
        });
    } else {
        self._hooks[hook] =  self._hooks[hook] || [];
        self._hooks[hook].push(callback);
    }
    return self;
}

/**
Fire a plugin event
*/
SkyServer.prototype._fireHook = function _fireHook(hook,params,callback) {
    callback = typeof callback === 'function' ? callback : function () {};

    var app = this._app,
        hookList = this._hooks[hook];

    if (!slangx.isArray(hookList) || !hookList.length) {
        return callback();
    }
    async.each(hookList, function (fn, next) {
        fn(app,params,next);
    }, callback);

};

SkyServer.prototype.destroy = function (callback) {
    var server = this._server,
        connections = this._connections;

    server.close(callback);
    for (var key in connections) {
        if (connections.hasOwnProperty(key)) {
            connections[key].destroy();
        }
    }
    
    this._server = null;
    this._connections = null;
};


module.exports = SkyServer;

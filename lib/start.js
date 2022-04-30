'use strict';

var async = require('async'),
	path =  require('path'),
	winston = require('winston');

var  nfs = require("skynode-nfs"),
     slangx = require('skylark-langx'),
     webserver;

const myconsole = new winston.transports.Console();
winston.add(myconsole);


module.exports =  function start() {
	var config = parseConfig();

	setupMonitor();

	async.waterfall([
		function (next) {
			var SkyServer = require('./server');
			webserver = new SkyServer({
				"config" : config
			});

	       async.series([
	            function(next) {
	                webserver.init(next);
	            },
	            function(next) {
	                webserver.start(next);
	            }    
	        ],next);
         
		},
	], function (err) {
		if (err) {
			winston.error(err);
			// Either way, bad stuff happened. Abort start.
			process.exit();
		}

		if (process.send) {
			process.send({
				action: 'listening',
			});
		}
	});
};


function parseConfig() {
    var localconfigFile;

    if (!process.env.CONFIG && process.argv[2]) {
        process.env.CONFIG = process.argv[2];
    }

    // If a custom config is passed in, resolve its path
    if (process.env.CONFIG) {
        localconfigFile = path.resolve(process.cwd(), process.env.CONFIG);
    }

    if (!localconfigFile || !nfs.existsSync(localconfigFile)) {
        // try the cwd
        localconfigFile = path.resolve(path.resolve(process.cwd(), 'web.json'));
    }

    console.log('Config from %s', localconfigFile);

    var config = require('./web.default.json');
    config.root = config.root || path.dirname(localconfigFile);

    if (nfs.existsSync(localconfigFile)) {
        var  localconfig = require(localconfigFile);

        localconfig.middlewares = localconfig.middlewares || {};
        if (localconfig.http) {
            localconfig.middlewares.http = localconfig.http;
            delete localconfig.http;
        }
        if (localconfig.restapi) {
            localconfig.middlewares.restapi = localconfig.restapi;
            delete localconfig.restapi ;
        }

        slangx.mixin(config, localconfig,true);
    }

	return config;
}


function setupMonitor() {

	function restart() {
		if (process.send) {
			winston.info('[app] Restarting...');
			process.send({
				action: 'restart',
			});
		} else {
			winston.error('[app] Could not restart server. Shutting down.');
			shutdown(1);
		}
	}

	function shutdown(code) {
		winston.info('[app] Shutdown (SIGTERM/SIGINT) Initialised.');
		async.waterfall([
			function (next) {
				webserver.destroy(next);
			},
			function (next) {
				winston.info('[app] Web server closed to connections.');
			},
		], function (err) {
			if (err) {
				winston.error(err);
				return process.exit(code || 0);
			}
			winston.info('[app] Database connection closed.');
			winston.info('[app] Shutdown complete.');
			process.exit(code || 0);
		});
	}

	process.on('SIGTERM', shutdown);
	process.on('SIGINT', shutdown);
	process.on('SIGHUP', restart);

	process.on('uncaughtException', function (err) {
		console.error(err);
		winston.error(err);

		shutdown(1);
	});
}



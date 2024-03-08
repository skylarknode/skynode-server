'use strict';

var async = require('async'),
	path =  require('path'),
	nconf = require('nconf'),
	winston = require('winston');

var  nfs = require("skynode-nfs"),
     slangx = require('skylark-langx'),
     webserver;

///const myconsole = new winston.transports.Console();
///winston.add(myconsole);

function setupWinston() {
	if (!winston.format) {
		return;
	}

	// allow winton.error to log error objects properly
	// https://github.com/SkyBB/SkyBB/issues/6848
	/*
	const winstonError = winston.error;
	winston.error = function (msg, error) {
		console.log("winston.error:" + msg);
		if (msg instanceof Error) {
			winstonError(msg.stack);
		} else if (error instanceof Error) {
			msg = msg + '\n' + error.stack;
			winstonError(msg);
		} else {
			winstonError.apply(null, arguments);
			winstonError(msg,error);
		}
	};
    */

	// https://github.com/winstonjs/winston/issues/1338
	// error objects are not displayed properly
	const enumerateErrorFormat = winston.format((info) => {
		if (info.message instanceof Error) {
			info.message = Object.assign({
				message: `${info.message.message}\n${info.message.stack}`,
			}, info.message);
		}

		if (info instanceof Error) {
			return Object.assign({
				message: `${info.message}\n${info.stack}`,
			}, info);
		}

		return info;
	});
	var formats = [];
	formats.push(enumerateErrorFormat());
	if (nconf.get('log-colorize') === 'true') {
		formats.push(winston.format.colorize());
	}

	if (nconf.get('json-logging')) {
		formats.push(winston.format.timestamp());
		formats.push(winston.format.json());
	} else {
		const timestampFormat = winston.format((info) => {
			var dateString = new Date().toISOString() + ' [' + nconf.get('port') + '/' + global.process.pid + ']';
			info.level = dateString + ' - ' + info.level;
			return info;
		});
		formats.push(timestampFormat());
		formats.push(winston.format.splat());
		formats.push(winston.format.simple());
	}

	winston.configure({
		level: nconf.get('log-level') || (global.env === 'production' ? 'info' : 'verbose'),
		format: winston.format.combine.apply(null, formats),
		transports: [
			///new winston.transports.Console({
			///	handleExceptions: true,
			///	level: 'error'  // add by lwf
			///}),
			new winston.transports.Console({
				handleExceptions: true,
				level: 'info'  // add by lwf
			}),
		],
	});
}

setupWinston();

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



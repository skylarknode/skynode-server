'use strict';

const fs = require('fs'),
    path = require('path'),
    existsSync = fs.existsSync || path.existsSync; // yeah folks, have some of that.

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

module.exports = {
    "start": function(args, ctor) {
        if (!ctor) {
            ctor = module.exports.Server;
        }
        var localconfigFile;

        if (!process.env.CONFIG && process.argv[2]) {
            process.env.CONFIG = process.argv[2];
        }

        // If a custom config is passed in, resolve its path
        if (process.env.CONFIG) {
            localconfigFile = path.resolve(process.cwd(), process.env.CONFIG);
        }

        if (!fs.existsSync(localconfigFile)) {
            // try the cwd
            localconfigFile = path.resolve(path.resolve(process.cwd(), 'web.json'));
        }

        console.log('Config from %s', localconfigFile);

        var config = require('./web.default.json');
        config.root = config.root || path.dirname(localconfigFile);

        if (existsSync(localconfigFile)) {
            var localconfig = require(localconfigFile);

            localconfig.middlewares = localconfig.middlewares || {};
            if (localconfig.http) {
                localconfig.middlewares.http = localconfig.http;
                delete localconfig.http;
            }
            if (localconfig.restapi) {
                localconfig.middlewares.restapi = localconfig.restapi;
                delete localconfig.restapi;
            }

            deepExtend(config, localconfig);
        }


        var instant = new ctor();
        instant.init(config);
        instant.start();
        return instant;

    },
    email: require("./email"),
    errors: require("./errors"),
    metrics: require("./metrics"),
    utils: require("./utils"),
    Server: require("./server"),
    stores: require("./stores")
};
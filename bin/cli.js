#!/usr/bin/env node

var cmd = require('commander'),
    path = require('path'),
    fs = require('fs'),
    server;

function error(msg) {
  console.error('\n  error: ' + msg + '\n');
  process.exit(1);
}

cmd.version(require('../package.json').version);

cmd.option('-p --port <port>', 'port to run on', function (port) {
  port = parseInt(port, 10);
  if (port) {
    process.env.PORT = port;
  } else {
    error('-p port must be numeric');
  }
});

cmd.option('-c --config <config.json>', 'path to config file', function (file) {
  file = path.resolve(process.cwd(), file);

  if ((path.existsSync || fs.existsSync)(file)) {
    process.env.CONFIG = file;
  } else {
    error('-c config must be path to a valid config file');
  }
});

cmd.option('-l --logger <default|short|tiny|dev|none>', 'server logger option', function (logger) {
  var valid = 'default short tiny dev none'.split(' ');

  if (valid.indexOf(logger) !== -1) {
    process.env.LOGGER = logger;
  } else {
    error('-l logger must be one of "' + valid.join('" or "') + '"');
  }
});

cmd.option('-e --env <development>', 'deployment environment', function (env) {
  process.env.NODE_ENV = env;
});

cmd.parse(process.argv);

server  = require('../lib/server.js');

server.start();

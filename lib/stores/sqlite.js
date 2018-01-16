var sqlite3 = require('sqlite3').verbose(),
    utils = require("../utils"),
    fs = require('fs'),
    path = require("path");

var noop = function () {};

module.exports = utils.inherit(Object, {
  constructor: function SQLite(options,config) {
    this.options = options;
    this.database = options.location;
    this.initScript = options.initScript;
    if (config && config.root) {
      this.database = path.join(config.root,this.database);
      this.initScript = path.join(config.root,this.initScript);
    }
  },
  connect: function (fn) {
    var self = this;
    this.connection = new sqlite3.Database(this.database, function (err) {
      if (self.initScript) {
        fs.readFile(self.initScript, 'utf8', function (err, sql) {
          if (err) {
            return fn(err);
          }
          self.connection.serialize(function () {
            sql = sql.trim();
            if (sql) {
              self.connection.exec(sql, fn);
            } else {
              fn();
            }
          });
        });

      }
    });
  },
  disconnect: function (fn) {
    this.connection.close();
    fn();
  }
});

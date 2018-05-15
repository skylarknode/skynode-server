var sqlite3 = require('sqlite3').verbose(),
    utils = require("../utils"),
    fs = require('fs'),
    path = require("path");

var noop = function () {};

module.exports = utils.inherit(Object, {
  constructor: function SQLite(options) {
    this.options = options;
    this.database = options.location;
    this.initScript = options.initScript;
    if (this.initScript && typeof this.initScript === "string") {
      this.initScript = [this.initScript];
    }
    if (options && options.root) {
      this.database = path.join(options.root,this.database);
      for (var i=0;i<this.initScript.length;i++) {
        this.initScript[i] = path.join(options.root,this.initScript[i]);
      }
    }
  },
  connect: function (fn) {
    var self = this;
    this.connection = new sqlite3.Database(this.database, function (err) {
      if (self.initScript) {
        var count =0;
        for (var i=0;i<self.initScript.length;i++) {
          fs.readFile(self.initScript[i], 'utf8', function (err, sql) {
            if (err) {
              return fn(err);
            }
            self.connection.serialize(function () {
              sql = sql.trim();
              if (sql) {
                self.connection.exec(sql, fn);
              } else {
                count ++;
                if (count == self.initScript.length) {
                  fn();
                }
              }
            });
          });          
        }

      } else {
        fn();
      }
    });
  },
  disconnect: function (fn) {
    this.connection.close();
    fn();
  }
});

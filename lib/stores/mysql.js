'use strict';
var mysql = require('mysql'),
    templates = require('./sql_templates'),
    utils = require("../utils");

module.exports = utils.inherit(Object, {
  defaults: null,
  constructor: function MySQL(options) {
    this.options    = options;
    this.connection = mysql.createPool(options);
    // note: the this.connection.connect() is implicit
  },
  connect: function (fn) {
    // this used to be conditional to set the charset on the database, but the
    // upgrade in node-mysql meant that we don't need it anymore, so we just
    // keep method for parity with the sqlite adapter.
    fn();
  },
  disconnect: function (fn) {
    this.connection.end(fn);
  }
});

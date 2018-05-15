var metrics = require("../metrics");


function requireAdapter(name) {
    return require('./' + name)
}

function Store(options) {
  //if (options.adapter !== 'mysql') {
  //  throw new Error(`${options.adapter} is not supported, only mysql as of v4.`);
  //  process.exit(1);
  //}
  var Adapter = requireAdapter(options.adapter);
  this.adapter = new Adapter(options[options.adapter]);
  check(this.adapter, methods);
}

function noopWithCallback () {
  var callback = arguments[arguments.length - 1];
  callback(null, {});
}

var check = function (adapter, methods) {
  methods.forEach(function (method) {
    if (!adapter[method]) {
      console.error('DB adapter missing method: ' + method);
      adapter[method] = noopWithCallback;
    }
  });
};

// Methods that should be supported by adaptors.
var methods = [
  'connect',
  'disconnect',
];

// Proxy the methods through the store.
methods.forEach(function (method) {
  Store.prototype[method] = function () {
    metrics.increment('db.method');
    metrics.increment('db.method.' + method);
    this.adapter[method].apply(this.adapter, arguments);
  };
});

module.exports = {
  create : function (options) {
    return new Store(options);
  },

  setup : function(methods,adapter) {
    var Adapter = requireAdapter(adapter);
    function attach(name,fn) {
      Adapter.prototype[name] = fn;
      Store.prototype[name] = Store.prototype[name] || function () {
        metrics.increment('db.method');
        metrics.increment('db.method.' + name);
        console.log("method:" + name);
        this.adapter[name].apply(this.adapter, arguments);
      };      
    }
    for (var methodName in methods) {
      attach(methodName,methods[methodName]);
    }
  },

  Store : Store
};

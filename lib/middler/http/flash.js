'use strict';

module.exports = function(app,options) {
    function flash(key, message) {
      // `this` refers to the request object
      // jshint validthis:true
      var cache = this.flashCache = this.flashCache || {},
          value;

      // We store the flash on the session whenever we can
      // However, if we send a flash message before sessions exist
      // i.e in run.js, we store on the req object.
      // the cache object starts on the request, and if it is empty
      // and a session exists we then move it to teh session.
      if (Object.keys(cache).length === 0 && this.session) {
        if (!this.session.flashCache) {
          this.session.flashCache = {};
        }
        cache = this.session.flashCache;
      }

      if (arguments.length === 2) {
        cache[key] = message;
        return this;
      } else if (arguments.length === 1) {
        value = cache[key];
        delete cache[key];
        return value;
      }

      this.flashCache = this.session.flashCache = {};
      return cache;
    }
    
    app.use(function(req, res, next) {
        req.flash = res.flash = flash.bind(req);

        req.flash.INFO = 'info';
        req.flash.ERROR = 'error';
        req.flash.NOTIFICATION = 'notification';
        req.flash.REFERER = 'referer';

        next();
    });
};

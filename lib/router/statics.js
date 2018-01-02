'use strict';

const express = require('express'),
      path = require('path');

module.exports = function(app,statics) {
    var staticPaths = statics.paths,
        staticOptions = {};

    for (var key in statics) {
        if (key !== "paths") {
            staticOptions[key] = statics[key];
        }
    }

    if (Array.isArray(staticPaths)) {
        staticPaths.forEach(function (staticPath) {
           app.use(staticPath.mapping,express.static(path.join(app.get("root"),staticPath.dir),staticOptions));
           console.log("static path:" + staticPath.mapping);
        });
    }    
};

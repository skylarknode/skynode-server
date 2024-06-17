'use strict';

const express = require('express'),
      colors = require('colors'),
      fs = require('fs'),
      path = require('path'),
      replacestream = require('replacestream');


module.exports = function(app,spas) {
    var spaPaths = spas.paths,
        spaOptions = {};

    for (var key in spas) {
        if (key !== "paths") {
            spaOptions[key] = spas[key];
        }
    }

    function initSingePageApp(spaContextPath, spaRootDir,routeMiddleware) {

        let spaConf = require(spaRootDir + "/spa-config");

        if (!spaConf) {
            console.error(appPath + ": the spa-config.json is not found!");
            return;
        }

        spaConf.contextPath = spaContextPath;

        let spaConfJSON = JSON.stringify(spaConf);

        app.get(spaContextPath + "/spa-config.json", (req, res) => {
            res.setHeader('content-type', 'application/json');
            res.send(spaConfJSON);
        });

        //let handler = (req, res) => res.sendFile(path.join(this.spaRootDir, "index.html"))
        app.get(spaContextPath + "/index.html", (req, res) => {
            res.status(404);
            res.end('notfound! : ' + req.path);
        });

        let handler = (req, res) => {
            let html = path.join(spaRootDir, "index.html");
            res.setHeader('content-type', 'text/html');
            let replacement = `</title><base href="${spaContextPath}/">`;
            fs.createReadStream(html).pipe(replacestream('</title>', replacement)).pipe(res);
        };

        let routes = [];

        console.log(colors.yellow("context path:" + spaContextPath));
        if (spaConf.routes) {
            for (var name in spaConf.routes) {
                if (spaConf.routes[name].pathto) {
                    routes.push(spaConf.routes[name].pathto);
                    console.log(colors.blue.underline("spa route:" + routes[routes.length - 1]));
                }
            }
        }

        routes.forEach(route => {
            let _r = spaContextPath + route;
            if (routeMiddleware) {
                app.get(_r, routeMiddleware, handler);
            } else {
                app.get(_r, handler);
            }
        });

        app.use(spaContextPath + "/lib", express.static(path.join(spaRootDir, "lib")));
        app.use(spaContextPath + "/assets", express.static(path.join(spaRootDir, "assets")));
        app.use(spaContextPath + "/scripts", express.static(path.join(spaRootDir, "scripts")));

    }
    if (Array.isArray(spaPaths)) {
        spaPaths.forEach(function (spaPath) {
            var middleware = spaPath.middleware || spas.middleware,
                routeMiddleware = null;
            if (middleware) {
                routeMiddleware = require(path.join(app.get("basedir"),middleware));
            }
            initSlaxApp(spaPath.mapping,path.join(app.get("basedir"),spaPath.dir),routeMiddleware);
        });
    }    
};

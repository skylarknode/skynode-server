'use strict';

const express = require('express'),
      colors = require('colors'),
      fs = require('fs'),
      path = require('path'),
      replacestream = require('replacestream');


module.exports = function(app,slaxes) {
    var slaxPaths = slaxes.paths,
        slaxOptions = {};

    for (var key in slaxes) {
        if (key !== "paths") {
            slaxOptions[key] = slaxes[key];
        }
    }


    function slaxDefaultRouteDispatcher(app,slaxContextPath,slaxRootDir,slaxAppConf,routeMiddleware) {
        //let handler = (req, res) => res.sendFile(path.join(this.slaxRootDir, "index.html"))
        app.get(slaxContextPath + "/index.html", (req, res) => {
            res.status(404);
            res.end('notfound! : ' + req.path);
        });

        let handler = (req, res) => {
            let html = path.join(slaxRootDir, "index.html");
            res.setHeader('content-type', 'text/html');
            let replacement = `</title><base href="${slaxContextPath}/">`;
            fs.createReadStream(html).pipe(replacestream('</title>', replacement)).pipe(res);
        };

        let routes = [];

        console.log(colors.yellow("context path:" + slaxContextPath));
        if (slaxAppConf.routes) {
            for (var name in slaxAppConf.routes) {
                if (slaxAppConf.routes[name].pathto) {
                    routes.push(slaxAppConf.routes[name].pathto);
                    console.log(colors.blue.underline("slax route:" + routes[routes.length - 1]));
                }
            }
        }

        routes.forEach(route => {
            let _r = slaxContextPath + route;
            if (routeMiddleware) {
                app.get(_r, routeMiddleware, handler);
            } else {
                app.get(_r, handler);
            }
        });

        ///app.use(slaxContextPath + "/lib", express.static(path.join(slaxRootDir, "lib")));
        ///app.use(slaxContextPath + "/assets", express.static(path.join(slaxRootDir, "assets")));
        ///app.use(slaxContextPath + "/scripts", express.static(path.join(slaxRootDir, "scripts")));

    }

    function initSlaxApp(slaxContextPath, slaxRootDir,routeMiddleware,routeDispatcher) {

        let slaxAppConf;
        try {
           slaxAppConf = require(slaxRootDir + "/slax-config");
        } catch(e) {

        }

        if (!slaxAppConf) {
            try {
                slaxAppConf = require(slaxRootDir + "/slax");
            } catch(e) {
            }
            if (!slaxAppConf) {
                console.error(appPath + ": the slax-config.json is not found!");
            }
            return;
        }

        slaxAppConf.contextPath = slaxContextPath;

        let slaxAppConfJSON = JSON.stringify(slaxAppConf);

        app.get(slaxContextPath + "/slax-config.json", (req, res) => {
            res.setHeader('content-type', 'application/json');
            res.send(slaxAppConfJSON);
        });

        if (routeDispatcher) {
            routeDispatcher(app,slaxContextPath,slaxRootDir,routeMiddleware)
        }

    }
    if (Array.isArray(slaxPaths)) {
        slaxPaths.forEach(function (slaxPath) {
            var middleware = slaxPath.middleware || slaxes.middleware,
                dispatcher  = slaxPath.dispatcher || "default",
                routeMiddleware = null,
                routeDispatcher = null;
            if (middleware) {
                routeMiddleware = require(path.join(app.get("root"),middleware));
            }
            if (dispatcher == "default") {
                routeDispatcher = slaxDefaultRouteDispatcher
            } else if (dispatcher != "custom") {
                routeDispatcher = require(path.join(app.get("root"),dispatcher));
            }
            initSlaxApp(slaxPath.mapping,path.join(app.get("root"),slaxPath.dir),routeMiddleware,routeDispatcher);
        });
    }    
};

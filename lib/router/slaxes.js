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

    function initSlaxApp(slaxContextPath, slaxRootDir,routeMiddleware) {

        let slaxAppConf = require(slaxRootDir + "/slax-config");

        if (!slaxAppConf) {
            console.error(appPath + ": the slax-config.json is not found!");
            return;
        }

        slaxAppConf.contextPath = slaxContextPath;

        let slaxAppConfJSON = JSON.stringify(slaxAppConf);

        app.get(slaxContextPath + "/slax-config.json", (req, res) => {
            res.setHeader('content-type', 'application/json');
            res.send(slaxAppConfJSON);
        });

        //let handler = (req, res) => res.sendFile(path.join(this.slaxRootDir, "index.html"))
        app.get(slaxContextPath + "/index.html", (req, res) => {
            res.status(404);
            res.end('notfound! : ' + req.path);
        });


        console.log(colors.yellow("slax context path:" + slaxContextPath));

        let router =  (rootContextPath,routes, rootDir,auth, opts) => {
            ///let routes = [];
            ///for (var name in slaxAppConf.routes) {
            ///    if (slaxAppConf.routes[name].pathto) {
            ///        routes.push(slaxAppConf.routes[name].pathto);
            ///        console.log(colors.blue.underline("slax route:" + routes[routes.length - 1]));
            ///    }
            ///}
            ///routes.forEach(route => {
            ///    let _r = contextPath + route;
            ///    if (routeMiddleware) {
            ///        app.get(_r, routeMiddleware, handler);
            ///    } else {
            ///        app.get(_r, handler);
            ///    }
            ///});

           console.log(colors.yellow("slax page context path:" + rootContextPath));

            let handler = (req, res) => {
                let html = path.join(rootDir, "index.html");
                res.setHeader('content-type', 'text/html');
                let replacement = `</title><base href="${rootContextPath}/">`;
                fs.createReadStream(html).pipe(replacestream('</title>', replacement)).pipe(res);
            };

            Object.values(routes).forEach(route => {
                let _r = rootContextPath + route.pathto;
                if (routeMiddleware) {
                    app.get(_r, routeMiddleware, handler);
                } else {
                    app.get(_r, handler);
                }
            });

        };

        if (slaxAppConf.routes) {
            // single page application 
            router(slaxContextPath,slaxAppConf.routes,slaxRootDir);
        } else if (slaxAppConf.pages){
            // multi pages application
            slaxAppConf.pages.forEach(pageConf => {
                let rootPath = slaxContextPath + pageConf.contextPath;
                let rootDir = path.join(slaxRootDir, pageConf.dir);
                let routesFilePath = path.join(rootDir, "routes.json");
                let routes = JSON.parse(fs.readFileSync(routesFilePath, 'utf8'));
                router(rootPath,routes,rootDir);
            });
        }


        app.use(slaxContextPath + "/lib", express.static(path.join(slaxRootDir, "lib")));
        app.use(slaxContextPath + "/assets", express.static(path.join(slaxRootDir, "assets")));
        app.use(slaxContextPath + "/scripts", express.static(path.join(slaxRootDir, "scripts")));

    }
    if (Array.isArray(slaxPaths)) {
        slaxPaths.forEach(function (slaxPath) {
            var middleware = slaxPath.middleware || slaxes.middleware,
                routeMiddleware = null;
            if (middleware) {
                routeMiddleware = require(path.join(app.get("basedir"),middleware));
            }
            initSlaxApp(slaxPath.mapping,path.join(app.get("basedir"),slaxPath.dir),routeMiddleware);
        });
    }    
};

'use strict';

const express = require('express'),
    colors = require('colors'),
    fs = require('fs'),
    path = require('path'),
    replacestream = require('replacestream');


module.exports = function(app, slaxes) {
    var slaxPaths = slaxes.paths,
        slaxOptions = {};

    for (var key in slaxes) {
        if (key !== "paths") {
            slaxOptions[key] = slaxes[key];
        }
    }

    function initSlaxApp(slaxContextPath, slaxRootDir) {

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
            app.get(_r, handler);
        });

        app.use(slaxContextPath + "/lib", express.static(path.join(slaxRootDir, "lib")));
        app.use(slaxContextPath + "/assets", express.static(path.join(slaxRootDir, "assets")));
        app.use(slaxContextPath + "/scripts", express.static(path.join(slaxRootDir, "scripts")));

    }
    if (Array.isArray(slaxPaths)) {
        slaxPaths.forEach(function(slaxPath) {
            initSlaxApp(slaxPath.mapping, path.join(app.get("root"), slaxPath.dir));
        });
    }
};
'use strict';

const express = require('express'),
    exphbs = require('express-handlebars'),
      flash = require('express-flash');

module.exports = function(app,options) {
    app.use(flash());

    var hbs = exphbs.create({
        defaultLayout: 'main'
    });
    app.set('views', path.join(__dirname, 'backend/views'));
    app.engine('handlebars', hbs.engine);
    app.set('view engine', 'handlebars');
    
};

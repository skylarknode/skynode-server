'use strict';

const express = require('express');

module.exports = function(app) {
    app.get('/aboutme', function(req, res) {
        res.redirect('http://www.hudaokeji.com');
    });
};

var createTransport = require('./nodemailer');
var undefsafe = require('undefsafe');
var EmailService = require('./EmailService');
var dummy = require('./Dummy');

var mailer = null;


module.exports = {
	createMailer : function (settings,smtp) {
		if (smtp) {
			return new EmailService(createTransport(smtp), settings);
		} else {
			return  new EmailService(dummy, settings);
		}
	}
};

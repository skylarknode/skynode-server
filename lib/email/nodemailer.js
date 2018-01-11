var nodemailer = require('nodemailer');

function createTransport(options) {
  var transporter = nodemailer.createTransport(options);

  return transporter;
}

module.exports = createTransport;

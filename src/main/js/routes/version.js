'use strict';

let packageJson = require('./../../../../package.json');

module.exports = {
  version: function (req, res, next) {
    res.send({version: packageJson.version});
    next();
  }
};
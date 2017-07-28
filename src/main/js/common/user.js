'use strict';

/**
 * User adapter class
 * @module user.js
 */

const jwt = require('restify-jwt');

let UserAdapter = function (userData) {
  let self = this;

  self.userData = userData;

  self.email = () => self.userData !== null && self.userData.email;

  /**
   * Determines if the user is anonymous
   * @func isAnonymous
   * @returns Boolean
   */
  self.isAuthenticated = () => self.userData !== null;

};

/** Sets up the user adapter to operate on incoming user data
  * @func _setupAdapter
  * @param req {Object} Incoming request object
  * @param res {Object} Outgoing response object
  * @param next {Function} Next function in middleware chain */
function _setupAdapter(req, res, next) {
  req.userAdapter = new UserAdapter(req.user);
  return next();
}

const fs = require('fs');
const signingCertificate = fs.readFileSync('src/main/resources/secrets/signing.cer');

module.exports = {
  UserAdapter: UserAdapter,

  mw: {
    auth:       [ jwt({ secret: signingCertificate }), _setupAdapter ]
  }
};
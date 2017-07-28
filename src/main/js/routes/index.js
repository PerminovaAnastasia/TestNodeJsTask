'use strict';

/**
 * Routing module
 * @module routes
 */
module.exports = function (server, mw) {
  /**
   * Version endpoints
   *
   **/
  let version = require('./version');
  server.get("/version", version.version);

  /**
   * User endpoints
   *
   **/
  let user = require('./user');
  server.post("/user/authenticate", mw.auth, user.authenticate); //login
  server.post("/user/signIn", user.signIn); //register

};
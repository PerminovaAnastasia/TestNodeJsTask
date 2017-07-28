'use strict';

const restify = require('restify');
const restifyErrors = require('restify-errors');

const common = require('./common');
const logger = common.logger;
const mw = common.user.mw;
const packageJson = require('./../../../package.json');

let server = restify.createServer({
   name:         packageJson.name,
   version:      packageJson.version,
   log:          logger
});

server.use(restify.acceptParser(server.acceptable));
server.use(restify.authorizationParser());

server.use(restify.CORS({
  origins: ['*'],
  credentials: true,
  headers: ['accept', 'accept-version', 'content-type', 'api-version', 'origin', 'x-requested-with', 'authorization']
}));

server.use(restify.dateParser());
server.use(restify.queryParser());
server.use(restify.gzipResponse());
server.use(restify.bodyParser({ mapFiles: true }));
server.use(restify.throttle({
  burst: 100,
  rate: 50,
  ip: true,
}));

server.use(restify.requestLogger());

server.on('MethodNotAllowed', (req, res) => {

  if (req.method.toLowerCase() === 'options') {
    let allowHeaders = ['Accept', 'Accept-Version', 'Content-Type', 'Api-Version', 'Authorization'];

    if (res.methods.indexOf('OPTIONS') === -1) {
      res.methods.push('OPTIONS');
    }

    res.header('Access-Control-Allow-Credentials', true);
    res.header('Access-Control-Allow-Headers', allowHeaders.join(', '));
    res.header('Access-Control-Allow-Methods', req.header("Access-Control-Request-Method"));
    res.header('Access-Control-Allow-Origin', req.headers.origin);

    return res.send(204);
  }

  return res.send(new restifyErrors.MethodNotAllowedError());

});


require('./routes')(server, mw);

module.exports = server;

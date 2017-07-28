'use strict';

let bunyan = require('bunyan');


const MICRO_SECONDS = 1000000;
const MILLISECOND = 1000;
///--- API

/**
 *
 * @param reqestTimers
 * @return {{}}
 */
function extracted(reqestTimers) {
  let timers = {};
  (reqestTimers || []).forEach(function (time) {
    let t = time.time;

    timers[time.name] = Math.floor((MICRO_SECONDS * t[0]) +
        (t[1] / MILLISECOND));
  });
  return timers;
}
/**
 * Returns a Bunyan audit logger suitable to be used in a server.on('after')
 * event.  I.e.:
 *
 * server.on('after', restify.auditLogger({ log: myAuditStream }));
 *
 * This logs at the INFO level.
 *
 * @public
 * @function auditLogger
 * @param   {Object}   options at least a bunyan logger (log).
 * @param {Boolean} options.body if true include response/request body into log record
 * @returns {Function}         to be used in server.after.
 */
function auditLogger(options) {
    let errSerializer = bunyan.stdSerializers.err;

    if (options.log.serializers && options.log.serializers.err) {
        errSerializer = options.log.serializers.err;
    }

    let log = options.log.child({
        audit: true,
        serializers: {
            err: errSerializer,
            req: function auditRequestSerializer(req) {
                if (!req) {
                    return false;
                }

                return {
                    // account for native and queryParser plugin usage
                    query: (typeof req.query === 'function') ?
                            req.query() : req.query,
                    method: req.method,
                    url: req.url,
                    headers: req.headers,
                    httpVersion: req.httpVersion,
                    trailers: req.trailers,
                    version: req.version(),
                    body: options.body && req.body,
                    timers: extracted(req.timers),
                    user: req.user && req.user.user,
                };
            },
            res: function auditResponseSerializer(res) {
                if (!res) {
                    return false;
                }

                return {
                    statusCode: res.statusCode,
                    headers: res._headers,
                    trailer: res._trailer || false,
                    body: options.body && res._body
                };
            }
        }
    });

    function audit(req, res, route, err) {
        let latency = res.get('Response-Time');

        if (typeof (latency) !== 'number') {
            latency = Date.now() - req._time;
        }

        /*jshint -W106*/
        let obj = {
            remoteAddress: req.connection.remoteAddress,
            remotePort: req.connection.remotePort,
            req_id: req.getId(),
            req: req,
            res: res,
            err: err,
            latency: latency,
            secure: req.secure,
            _audit: true
        };
        /*jshint +W106*/

        log.info(obj, 'handled: %d', res.statusCode);

        return true;
    }

    return audit;
}


///-- Exports

module.exports = auditLogger;

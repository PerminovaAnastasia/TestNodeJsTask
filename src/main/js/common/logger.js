'use strict';

/**
 * Bunyan logger implementation
 * @module logger
 */

const config          = require('config');
const bunyan = require('bunyan');
const restify = require('restify');
const restifyErrors = require('restify-errors');
const packageJson = require('../../../../package.json');
const KinesisWritable = require('aws-kinesis-writable');

// create the base logger configuration
let loggerOpts = {
  name: packageJson.name,

  serializers: {
    req: bunyan.stdSerializers.req,
    res: bunyan.stdSerializers.res,
    err: restifyErrors.bunyanSerializer
  },

  streams: [{
    level: "trace",
    stream: process.stdout
  }]
};

let loggerConf = config.get("logger");

if (loggerConf) {

  // only add the bunyan logstash stream, if there was one supplied
  // in the configuration
  if (loggerConf.kinesis) {

    loggerOpts.streams.push({
      stream: new KinesisWritable(loggerConf.kinesis)
    });

  }

}

module.exports = bunyan.createLogger(loggerOpts);

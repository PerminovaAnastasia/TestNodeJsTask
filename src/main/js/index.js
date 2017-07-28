'use strict';

const server  = require("./server");
const logger  = require("./common").logger;

server.listen(3000, () => {
  logger.info(`${server.name} listening at ${server.url}`);
});
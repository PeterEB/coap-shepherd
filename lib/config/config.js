'use strict';

var config = {
/***  server config  ***/
    server: {
        device: 'server',
        port: 5683,
        serverProtocol: 'udp4',
        dbPath: null
    },
/***  client config  ***/
    client: {
        device: 'client',
        lifetime: '85671',
        port: 36330,
        version: '1.0',
        serverProtocol: 'udp4'
    }
};

module.exports = config;

'use strict';

module.exports = {
    // indicates if the server should create IPv4 connections (udp4) or IPv6 connections (udp6).
    // default is udp4.
    connectionType: 'udp4',

    // the cserver's ip address.
    ip: '127.0.0.1',

    // the cserver's COAP server will start listening.
    // default is 5683.
    port: 5683,

    // storage for cnode persistence, should be an instance of StorageInterface if specified.
    // default is an instance of NedbStorage with `this.defaultDbPath` as storage file.
    storage: null,

    // request should get response in the time.
    // default is 60 secs.
    reqTimeout: 60,

    // how often to check heartbeat.
    // it must be greater than client device heartbeatTime.
    // default is 60 secs.
    hbTimeout: 60,

    // auto read client resources when it's registering.
    autoReadResources: true,

    // disable filtering for observed client packets. details:
    // https://github.com/mcollina/node-coap/issues/200
    disableFiltering: false,

    // a function to parse clientName. some clients may send 'urn:123456' as clientName,
    // you can use your own clientNameParser to keep just the '123456' part as clientName.
    clientNameParser: function (clientName) { return clientName; },

    // always fire devIncoming event, even if client is already online when registering.
    alwaysFireDevIncoming: false,

    // path to the file where the data is persisted, if default NedbStorage is used.
    // default is ./lib/database/coap.db.
    defaultDbPath: __dirname + '/database/coap.db'
};

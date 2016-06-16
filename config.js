'use strict';

module.exports = {

    // the cserver's ip address.
    ip: '127.0.0.1',

    // the cserver's COAP server will start listening.
    // default is 5683.
    port: 5683, 

    // indicates if the server should create IPv4 connections (udp4) or IPv6 connections (udp6).
    // default is udp4.
    connectionType: 'udp4', 

    // path to the file where the data is persisted.
    // default is ./lib/database/coap.db.
    dbPath: null,  

    // request should get response in the time.
    // default is 60 secs.
    reqTimeout: 30,

    // how often to check heartbeat.
    // it must be greater than client device heartbeatTime.
    // default is 40 secs.
    hbTimeout: 40
};

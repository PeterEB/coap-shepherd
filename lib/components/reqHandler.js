'use strict';

var _ = require('busyman'),
    debug = require('debug')('coap-shepherd:reqHdlr');

var CoapNode = require('./coap-node.js'),
    cutils = require('./cutils');

/**** Code Enumerations ****/
var RSP = { ok: '2.00', created: '2.01', deleted: '2.02', changed: '2.04', content: '2.05', badreq: '4.00',
            unauth: '4.01', forbid: '4.03', notfound: '4.04', notallowed: '4.05', timeout: '4.08',  dberror: '5.00' };

/*********************************************************
 * Handler function                                      *
 *********************************************************/
function clientReqHandler(shepherd, req, rsp) {
    var optType = clientReqParser(req),
        reqHdlr;

    switch (optType) {
        case 'register':
            reqHdlr = clientRegisterHandler;
            break;
        case 'update':
            reqHdlr = clientUpdateHandler;
            break;
        case 'deregister':
            reqHdlr = clientDeregisterHandler;
            break;
        case 'check':
            reqHdlr = clientCheckHandler;
            break;
        case 'lookup':
            reqHdlr = clientLookupHandler;
            break;
        case 'empty':
            rsp.reset();
            break;
        default:
            break;
    }

    if (reqHdlr)
        setImmediate(function () {
            reqHdlr(shepherd, req, rsp);
        });
}

function clientRegisterHandler (shepherd, req, rsp) {
    var devAttrs = buildDevAttrs(req),
        cnode = shepherd.find(devAttrs.clientName),
        errCount = 0;

    debug('REQ <-- register, token: %s', req._packet ? req._packet.token.toString('hex') : undefined);

    if (devAttrs === false || !devAttrs.clientName || !devAttrs.objList) 
        return sendRsp(rsp, RSP.badreq, '', 'register');
    
    if (shepherd._joinable === 'off') 
        return sendRsp(rsp, RSP.notallowed, '', 'register');
    
    function clientRealRegistered() {
        _.delay(function() {
            cnode._readAllResource().then(function (rspObj) {
                return cnode.dbSave();
            }).then(function () {
                return cnode.observeReq('/heartbeat');
            }).then(function () {
                fireImmediate(shepherd, 'ind', { 
                    type: 'devIncoming', 
                    cnode: cnode
                });
                cnode._setStatus('online');
                return cnode._reinitiateObserve();
            }).fail(function (err) {
                if (errCount < 2) {
                    errCount += 1;
                    clientRealRegistered();
                } else {
                    errCount = 0;
                    shepherd.emit('error', err);
                }
            }).done();
        }, 50);
    }

    if (!cnode) {
        cnode = new CoapNode(shepherd, devAttrs);
        shepherd._registry[devAttrs.clientName] = cnode;
        cnode._registered = true;
        cnode._heartbeat = cutils.getTime();
        cnode.lifeCheck(true);
        
        rsp.setOption('Location-Path', [new Buffer('rd'),new Buffer(cnode.clientId.toString())]);
        sendRsp(rsp, RSP.created, '', 'register');

        return cnode._registered ? clientRealRegistered() : false;
    } else {
        cnode._updateAttrs(devAttrs).then(function (diff) {
            cnode._registered = true;
            cnode._heartbeat = cutils.getTime();
            cnode.lifeCheck(true);

            rsp.setOption('Location-Path', [new Buffer('rd'),new Buffer(cnode.clientId.toString())]);
            sendRsp(rsp, RSP.changed, '', 'register');

            return cnode._registered ? clientRealRegistered() : false;
        }, function (err) {
            sendRsp(rsp, RSP.dberror, '', 'register');
            shepherd.emit('error', err);
        }).done();
    }
}

function clientUpdateHandler (shepherd, req, rsp) {
    var devAttrs = buildDevAttrs(req),
        locationPath = cutils.urlParser(req.url).pathname,
        cnode = shepherd._findByLocationPath(locationPath),
        diff,
        msg = {};
        
    debug('REQ <-- update, token: %s', req._packet ? req._packet.token.toString('hex') : undefined);

    if (devAttrs === false) 
        return sendRsp(rsp, RSP.badreq, '', 'update');

    if (cnode) {
        cnode._updateAttrs(devAttrs).then(function (diffAttrs) {
            diff = diffAttrs;
            cnode._setStatus('online');
            cnode._heartbeat = cutils.getTime();
            cnode.lifeCheck(true);
            if (diff.objList) {
                return cnode._readAllResource().then(function (rspObj) {
                    return cnode.dbSave();
                });
            }
        }).then(function () {            
            if (_.isEmpty(diff)) {
                sendRsp(rsp, RSP.ok, '', 'update');
            } else {
                sendRsp(rsp, RSP.changed, '', 'update');
                _.forEach(diff, function (val, key) {
                    msg[key] = val;
                });
            }

            fireImmediate(shepherd, 'ind', { 
                type: 'devUpdate', 
                cnode: cnode,
                data: msg 
            });
        }, function (err) {
            sendRsp(rsp, RSP.dberror, '', 'update');
            shepherd.emit('error', err);
        }).done();
    } else {
        sendRsp(rsp, RSP.notfound, '', 'update');
    }
}

function clientDeregisterHandler (shepherd, req, rsp) {
    var locationPath = cutils.urlParser(req.url).pathname,
        cnode = shepherd._findByLocationPath(locationPath),
        clientName = cnode.clientName,
        mac = cnode.mac;
        
    debug('REQ <-- deregister, token: %s', req._packet ? req._packet.token.toString('hex') : undefined);

    if (cnode) {
        shepherd.remove(clientName).then(function () {
            sendRsp(rsp, RSP.deleted, '', 'deregister');
        }, function (err) {
            sendRsp(rsp, RSP.dberror, '', 'deregister');
        }).done();
    } else {
        sendRsp(rsp, RSP.notfound, '', 'deregister');
    }
}

function clientCheckHandler (shepherd, req, rsp) {
    var locationPath = cutils.urlParser(req.url).pathname,
        cnode = shepherd._findByLocationPath(locationPath),
        chkAttrs = buildChkAttrs(req),
        devAttrs = {},
        errCount = 0;

    debug('REQ <-- check, token: %s', req._packet ? req._packet.token.toString('hex') : undefined);

    if (chkAttrs === false) 
        return sendRsp(rsp, RSP.badreq, '', 'check');

    function startHeartbeat() {
        _.delay(function() {
            cnode.observeReq('/heartbeat').then(function () {
                cnode._setStatus('online');
            }).fail(function (err) {
                if (errCount < 2) {
                    errCount += 1;
                    startHeartbeat();
                } else {
                    errCount = 0;
                    shepherd.emit('error', err);
                }
            }).done();
        }, 50);
    }

    if (cnode) {
        if (chkAttrs.sleep) {            // check out
            cnode._cancelAllObservers();
            cnode.sleepCheck(true, chkAttrs.duration);
            sendRsp(rsp, RSP.changed, '', 'check');
            cnode._setStatus('sleep');
        } else {                         // check in
            cnode.lifeCheck(true);
            cnode.sleepCheck(false);
            devAttrs.ip = req.rsinfo.address;
            devAttrs.port = req.rsinfo.port;
            cnode._heartbeat = cutils.getTime();
            cnode._updateAttrs(devAttrs).then(function () {
                sendRsp(rsp, RSP.changed, '', 'check');
                startHeartbeat();
            }, function (err) {
                sendRsp(rsp, RSP.dberror, '', 'check');
                shepherd.emit('error', err);
            }).done();
        }
    } else {
        sendRsp(rsp, RSP.notfound, '', 'check');
    }
}

function clientLookupHandler (shepherd, req, rsp) {
    var lookupType = cutils.pathSlashParser(req.url)[1],
        clientName = buildDevAttrs(req).clientName,
        cnode = shepherd.find(clientName),
        data;
        
    debug('REQ <-- lookup, token: %s', req._packet ? req._packet.token.toString('hex') : undefined);
// [TODO] check pathname & lookupType
    if (cnode) {
        data = '<coap://' + cnode.ip + ':' + cnode.port + '>;ep=' + cnode.clientName;
        sendRsp(rsp, RSP.content, data, 'lookup');
        fireImmediate(shepherd, 'ind', { type: 'lookup' , data: clientName });
    } else {
        sendRsp(rsp, RSP.notfound, '', 'lookup');
    }
}

/*********************************************************
 * Private function                                      *
 *********************************************************/
function clientReqParser (req) {
    var optType,
        lookupType,
        pathArray;

    if (req.code === '0.00' && req._packet.confirmable && req.payload.length === 0)
        return 'empty';

    switch (req.method) {
        case 'POST':
            pathArray = cutils.pathSlashParser(req.url);
            if (pathArray.length === 1 && pathArray[0] === 'rd') 
                optType = 'register';
            else
                optType = 'update';
            break;
        case 'PUT':
            optType = 'check';
            break;
        case 'DELETE':
            optType = 'deregister';
            break;
        case 'GET':
            optType = 'lookup';
            break;
        default:
            break;
    }

    return optType;
}

function sendRsp(rsp, code, data, optType) {
    rsp.code = code;
    rsp.end(data);
    debug('RSP --> %s, token: %s', optType, rsp._packet ? rsp._packet.token.toString('hex') : undefined);
}

function buildDevAttrs(req) {
    var devAttrs = {},  
        query = req.url ? req.url.split('?')[1] : undefined,    // 'ep=clientName&lt=86400&lwm2m=1.0.0'
        queryParams = query ? query.split('&') : undefined, 
        invalidAttrs = [];

    _.forEach(queryParams, function (queryParam, idx) {
        queryParams[idx] = queryParam.split('=');
    });

    _.forEach(queryParams, function(queryParam) {     
        if(queryParam[0] === 'ep') {
            devAttrs.clientName = queryParam[1];
        } else if (queryParam[0] === 'lt') {
            devAttrs.lifetime = parseInt(queryParam[1]);
        } else if (queryParam[0] === 'lwm2m') {
            devAttrs.version = queryParam[1];
        } else if (queryParam[0] === 'mac') {
            devAttrs.mac = queryParam[1];
        } else {
            invalidAttrs.push(queryParam[0]);
        }
    });

    devAttrs.ip = req.rsinfo.address;
    devAttrs.port = req.rsinfo.port;

    if (req.payload.length !== 0) {
        devAttrs.objList = cutils.getObjListOfSo(req.payload);
    }

    if (invalidAttrs.length > 0) {
        devAttrs = false;
    }

    return devAttrs;         // { clientName: 'clientName', lifetime: 86400, version: '1.0.0', objList: { "1": [] }}
}

function buildChkAttrs(req) {
    var chkAttrs = {},  
        query = req.url ? req.url.split('?')[1] : undefined,    // 'chk=out&t=300'
        queryParams = query ? query.split('&') : undefined, 
        invalidAttrs = [];

    _.forEach(queryParams, function (queryParam, idx) {
        queryParams[idx] = queryParam.split('=');
    });

    _.forEach(queryParams, function(queryParam) {     
        if(queryParam[0] === 'chk') {
            if (queryParam[1] === 'in')
                chkAttrs.sleep = false;
            else if (queryParam[1] === 'out')
                chkAttrs.sleep = true;
        } else if (queryParam[0] === 't') {
            chkAttrs.duration = Number(queryParam[1]);
        } else {
            invalidAttrs.push(queryParam[0]);
        }
    });

    if (invalidAttrs.length > 0) {
        chkAttrs = false;
    }

    return chkAttrs;
}

function fireImmediate(shepherd, evt, msg) { // (shepherd, evt, ...)
    setImmediate(function () {
        shepherd.emit(evt, msg);
    }); 
}

/*********************************************************
 * Module Exports                                        *
 *********************************************************/
module.exports = clientReqHandler;

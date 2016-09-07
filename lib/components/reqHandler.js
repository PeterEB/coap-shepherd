'use strict';

var _ = require('busyman'),
    debug = require('debug')('coap-shepherd:reqHdlr');

var CoapNode = require('./coap-node.js'),
    cutils = require('./cutils');

/**** Code Enumerations ****/
var RSP = { ok: '2.00', created: '2.01', deleted: '2.02', changed: '2.04', content: '2.05', badreq: '4.00',
            unauth: '4.01', forbid: '4.03', notfound: '4.04', notallowed: '4.05', timeout: '4.08',  dberror: '5.00' };

/*********************************************************
 * Handler function
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
        process.nextTick(function () {
            reqHdlr(shepherd, req, rsp);
        });
}

function clientRegisterHandler (shepherd, req, rsp) {
    var devAttrs = buildDevAttrs(req),
        cnode = shepherd.find(devAttrs.clientName),
        errCount = 0;

    if (devAttrs === false || !devAttrs.clientName || !devAttrs.objList) {
        rsp.code = RSP.badreq;
        rsp.end('');
        return false;
    }
    
    if (shepherd._joinable === 'off') {
        rsp.code = RSP.notallowed;
        rsp.end('');
        return false;
    }
    
    function clientRealRegistered() {
        _.delay(function() {
            cnode._readAllResource().then(function (rspObj) {
                return cnode.dbSave();
            }).then(function () {
                return cnode.observeReq('/heartbeat');
            }).then(function () {
                cnode._setStatus('online');
                shepherd.emit('ind', { 
                    type: 'devIncoming', 
                    cnode: cnode
                });
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

        rsp.code = RSP.created;
        rsp.setOption('Location-Path', cnode.locationPath);
        rsp.end('');

        return cnode._registered ? clientRealRegistered() : false;
    } else {
        cnode._updateAttrs(devAttrs).then(function (diff) {
            cnode._registered = true;
            cnode._heartbeat = cutils.getTime();
            cnode.lifeCheck(true);

            rsp.code = RSP.changed;
            rsp.setOption('Location-Path', cnode.locationPath);
            rsp.end('');

            return cnode._registered ? clientRealRegistered() : false;
        }, function (err) {
            rsp.code = RSP.dberror;
            rsp.end('');
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
        
    if (devAttrs === false) {
        rsp.code = RSP.badreq;
        rsp.end('');
        return false;
    }

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
                rsp.code = RSP.ok;
            } else {
                rsp.code = RSP.changed;
                _.forEach(diff, function (val, key) {
                    msg[key] = val;
                });
            }

            rsp.end('');
            shepherd.emit('ind', { 
                type: 'devUpdate', 
                cnode: cnode,
                data: msg 
            });
        }, function (err) {
            rsp.code = RSP.dberror;
            rsp.end('');
            shepherd.emit('error', err);
        }).done();
    } else {
        rsp.code = RSP.notfound;
        rsp.end('');
    }
}

function clientDeregisterHandler (shepherd, req, rsp) {
    var locationPath = cutils.urlParser(req.url).pathname,
        cnode = shepherd._findByLocationPath(locationPath),
        clientName = cnode.clientName,
        mac = cnode.mac;
        
    if (cnode) {
        shepherd.remove(clientName).then(function () {
            rsp.code = RSP.deleted;
            rsp.end('');
            shepherd.emit('ind', { 
                type: 'devLeaving', 
                cnode: clientName,
                data: mac
            });
        }, function (err) {
            rsp.code = RSP.dberror;
            rsp.end('');
        }).done();
    } else {
        rsp.code = RSP.notfound;
        rsp.end('');
    }
}

function clientCheckHandler (shepherd, req, rsp) {
    var locationPath = cutils.urlParser(req.url).pathname,
        cnode = shepherd._findByLocationPath(locationPath),
        chkAttrs = buildChkAttrs(req),
        devAttrs = {},
        errCount = 0;

    if (chkAttrs === false) {
        rsp.code = RSP.badreq;
        rsp.end('');
        return false;
    }

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
            rsp.code = RSP.changed;
            rsp.end('');
            cnode._setStatus('sleep');
        } else {                         // check in
            cnode.lifeCheck(true);
            cnode.sleepCheck(false);
            devAttrs.ip = req.rsinfo.address;
            devAttrs.port = req.rsinfo.port;
            cnode._heartbeat = cutils.getTime();
            cnode._updateAttrs(devAttrs).then(function () {
                rsp.code = RSP.changed;
                rsp.end('');
                startHeartbeat();
            }, function (err) {
                rsp.code = RSP.dberror;
                rsp.end('');
                shepherd.emit('error', err);
            }).done();
        }
    } else {
        rsp.code = RSP.notfound;
        rsp.end('');
    }
}

function clientLookupHandler (shepherd, req, rsp) {
    var lookupType = cutils.pathSlashParser(req.url)[1],
        clientName = buildDevAttrs(req).clientName,
        cnode = shepherd.find(clientName);
// [TODO] check pathname & lookupType
    if (cnode) {
        rsp.code = RSP.content;
        rsp.end('<coap://' + cnode.ip + ':' + cnode.port + '>;ep=' + cnode.clientName);
        shepherd.emit('ind', { type: 'lookup' , data: clientName });
    } else {
        rsp.code = RSP.notfound;
        rsp.end('');
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

// [TODO] check ip? mac?
function _clientReqIpChk(cn, req) {
    if (req.rsinfo.address !== cn.ip)
        return false;
    else 
        return true;
}
/*********************************************************
 * Module Exports                                        *
 *********************************************************/
module.exports = clientReqHandler;

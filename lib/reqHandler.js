'use strict';

var _ = require('busyman');

var CoapNode = require('./coap-node.js'),
    cutils = require('./utils/cutils');

/**** Code Enumerations ****/
var RSP = { ok: '2.00', created: '2.01', deleted: '2.02', changed: '2.04', content: '2.05', badreq: '4.00',
            unauth: '4.01', forbid: '4.03', notfound: '4.04', notallowed: '4.05', timeout: '4.08',  dberror: '5.00' };

/*********************************************************
 * Handler function
 *********************************************************/
function clientReqHandler(shepherd, req, rsp) {
    var optType = _clientReqParser(req),
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
    var devAttr = _buildDevAttr(req),
        cnode = shepherd.find(devAttr.clientName),
        errCount = 0;

    if (devAttr === false || !devAttr.clientName || !devAttr.objList) {
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
                shepherd.emit('ind', { type: 'registered', data: cnode });
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
        cnode = new CoapNode(shepherd, devAttr);
        shepherd._registry[devAttr.clientName] = cnode;
        cnode._registered = true;
        cnode._heartbeat = cutils.getTime();
        cnode.enableLifeChecker();
        rsp.code = RSP.created;
        rsp.setOption('Location-Path', cnode.locationPath);
        rsp.end('');

        if (cnode._registered === true && shepherd._shepherdTest) 
            clientRealRegistered();
        else if (cnode._registered === true) 
            cnode._setStatus('online');
    } else {
        cnode._updateAttrs(devAttr).then(function (diff) {
            cnode._setStatus('online');
            cnode._registered = true;
            cnode._heartbeat = cutils.getTime();
            cnode.enableLifeChecker();
            rsp.code = RSP.changed;
            rsp.setOption('Location-Path', cnode.locationPath);
            rsp.end('');
        }, function (err) {
            rsp.code = RSP.dberror;
            rsp.end('');
            shepherd.emit('error', err);
        }).done(function () {
            if (cnode._registered === true) {
                clientRealRegistered();
            }
        });
    }

    return true;
}

function clientUpdateHandler (shepherd, req, rsp) {
    var devAttr = _buildDevAttr(req),
        locationPath = cutils.urlParser(req.url).pathname,
        cnode = shepherd._findByLocationPath(locationPath),
        diff,
        msg = {};

    if (devAttr === false) {
        rsp.code = RSP.badreq;
        rsp.end('');
        return false;
    }

    if (cnode) {
        cnode._updateAttrs(devAttr).then(function (diffAttrs) {
            diff = diffAttrs;
            cnode._setStatus('online');
            cnode._heartbeat = cutils.getTime();
            cnode.enableLifeChecker();
            if (diff.objList) {
                return cnode._readAllResource().then(function (rspObj) {
                    return cnode.dbSave();
                });
            }
        }).then(function () {
            msg.device = cnode.clientName;
            
            if (_.isEmpty(diff)) {
                rsp.code = RSP.ok;
            } else {
                rsp.code = RSP.changed;
                _.forEach(diff, function (val, key) {
                    msg[key] = val;
                });
            }

            rsp.end('');

            if (shepherd._shepherdTest) 
                shepherd.emit('ind', { type: 'update', data: msg });
        }, function (err) {
            rsp.code = RSP.dberror;
            rsp.end('');
            shepherd.emit('error', err);
        }).done();
    } else {
        rsp.code = RSP.notfound;
        rsp.end('');
    }

    return true;
}

function clientDeregisterHandler (shepherd, req, rsp) {
    var locationPath = cutils.urlParser(req.url).pathname,
        cnode = shepherd._findByLocationPath(locationPath),
        clientName = cnode.clientName;

    if (cnode) {
        shepherd.remove(clientName).then(function () {
            rsp.code = RSP.deleted;
            rsp.end('');

            if (shepherd._shepherdTest)
                shepherd.emit('ind', { type: 'deregistered', data: clientName });
        }, function (err) {
            rsp.code = RSP.dberror;
            rsp.end('');
        }).done();
    } else {
        rsp.code = RSP.notfound;
        rsp.end('');
    }

    return true;
}

function clientLookupHandler (shepherd, req, rsp) {
    var lookupType = cutils.pathSlashParser(req.url)[1],
        clientName = cutils.getDevAttr(req).clientName,
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

    return true;
}

/*********************************************************
 * Private function                                      *
 *********************************************************/
function _clientReqParser (req) {
    var optType,
        lookupType;

    if (req.code === '0.00' && req._packet.confirmable && req.payload.length === 0)
        return 'empty';

    switch (req.method) {
        case 'POST':
            optType = 'register';
            break;
        case 'PUT':
            optType = 'update';
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

function _buildDevAttr(req) {
    var devAttr = {},  
        query = req.url ? req.url.split('?')[1] : undefined,
        queryParams = query ? query.split('&') : undefined,
        invalidAttrs = [];

    _.forEach(queryParams, function (queryParam, idx) {
        queryParams[idx] = queryParam.split('=');
    });

    _.forEach(queryParams, function(queryParam) {     // 'ep=clientName&lt=86400&lwm2m=1.0.0'
        if(queryParam[0] === 'ep') {
            devAttr.clientName = queryParam[1];
        } else if (queryParam[0] === 'lt') {
            devAttr.lifetime = parseInt(queryParam[1]);
        } else if (queryParam[0] === 'lwm2m') {
            devAttr.version = queryParam[1];
        } else if (queryParam[0] === 'mac') {
            devAttr.mac = queryParam[1];
        } else {
            invalidAttrs.push(queryParam[0]);
        }
    });

    devAttr.ip = req.rsinfo.address;
    devAttr.port = req.rsinfo.port;

    if (req.payload.length !== 0) {
        devAttr.objList = cutils.getObjListOfSo(req.payload);
    }

    if (invalidAttrs.length > 0) {
        devAttr = false;
    }

    return devAttr;         // { clientName: 'clientName', lifetime: 86400, version: '1.0.0', objList: { "1": [] }}
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

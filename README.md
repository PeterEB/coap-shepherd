# coap-shepherd
Network server and manager for lightweight M2M (LWM2M).

[![NPM](https://nodei.co/npm/coap-shepherd.png?downloads=true)](https://nodei.co/npm/coap-shepherd/)  

[![Build Status](https://travis-ci.org/PeterEB/coap-shepherd.svg?branch=develop)](https://travis-ci.org/PeterEB/coap-shepherd)
[![npm](https://img.shields.io/npm/v/coap-shepherd.svg?maxAge=2592000)](https://www.npmjs.com/package/coap-shepherd)
[![npm](https://img.shields.io/npm/l/coap-shepherd.svg?maxAge=2592000)](https://www.npmjs.com/package/coap-shepherd)

<br />

## Documentation  

Please visit the [Wiki](https://github.com/PeterEB/coap-shepherd/wiki).

<br />

## Overview

[**OMA Lightweight M2M**](http://technical.openmobilealliance.org/Technical/technical-information/release-program/current-releases/oma-lightweightm2m-v1-0) (LWM2M) is a resource constrained device management protocol relies on [**CoAP**](https://tools.ietf.org/html/rfc7252). And **CoAP** is an application layer protocol that allows devices to communicate with each other RESTfully over the Internet.  

**coap-shepherd**, **coap-node** and **lwm2m-bs-server** modules aim to provide a simple way to build and manage a **LWM2M** network.
* Server-side library: **coap-shepherd** (this module)
* Client-side library: [**coap-node**](https://github.com/PeterEB/coap-node)
* Bootstrap server library: [**lwm2m-bs-server**](https://github.com/PeterEB/lwm2m-bs-server)
* [**A simple demo webapp**](https://github.com/PeterEB/quick-demo)

![coap-shepherd net](https://raw.githubusercontent.com/PeterEB/documents/master/coap-shepherd/media/lwm2m_net.png) 

### LWM2M Server: coap-shepherd

* It is a **LWM2M** Server application framework running on node.js.  
* It follows most parts of **LWM2M** specification to meet the requirements of a machine network and devices management.  
* It works well with [**Leshan**](https://github.com/eclipse/leshan) and [**Wakaama**](https://github.com/eclipse/wakaama).
* Supports functionalities, such as permission of device joining, reading resources, writing resources, observing resources, and executing a procedure on a remote device.  
* It follows [**IPSO**](http://www.ipso-alliance.org/smart-object-guidelines/) data model to let you allocate and query resources on remote devices with semantic URIs in a comprehensive manner. 

<br />

## Installation

> $ npm install coap-shepherd --save

<br />

## Usage

This example shows how to start a server and allow devices to join the network within 180 seconds after the server is ready:

```js
var CoapShepherd = require('coap-shepherd');
var cserver = new CoapShepherd();

cserver.on('ready', function () {
    console.log('Server is ready.');

    // when server is ready, allow devices to join the network within 180 secs
    cserver.permitJoin(180);  
});

cserver.start(function (err) {  // start the server
    if (err)
        console.log(err);
});

// That's all to start a LWM2M server.
// Now cserver is going to automatically tackle most of the network managing things.
```

Or you can pass a config object as an argument to the CoapShepherd constructor:

```js
var CoapShepherd = require('coap-shepherd');
var cshepherd = new CoapShepherd({
    connectionType: 'udp6',
    port: 5500,
    defaultDbPath: __dirname + '/../lib/database/myShepherd.db'
});
```

<br />

## License

Licensed under [MIT](https://github.com/PeterEB/coap-shepherd/blob/master/LICENSE).

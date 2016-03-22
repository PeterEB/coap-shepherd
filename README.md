coap-shepherd
========================

## Table of Contents

1. [Overiew](#Overiew)    
2. [Features](#Features) 
3. [Installation](#Installation) 
4. [Usage](#Usage)
5. [APIs and Events](#APIs) 

<a name="Overiew"></a>
## 1. Overview



<a name="Features"></a>
## 2. Features



<a name="Installation"></a>
## 3. Installation

> $ npm install coap-shepherd --save

<a name="Usage"></a>
## 4. Usage

The following example starts a LWM2M server and opens permitJoin for devices to join in:

```js
var cserver = require('coap-shepherd');

cserver.on('ready', function () {
    console.log('Server is ready.');
    cserver.permitJoin(300);    // open for devices to join the network within 300 secs
});

cserver.start(function (err) {  // start the server
    if (err)
        console.log(err);
});
```

<a name="APIs"></a>
## 5. APIs and Events

#### 1. CoapShepherd APIs
>**cserver** is a singleton exported by `require('coap-shepherd')`.

* [cserver.start()](#API_start)
* [cserver.stop()](#API_stop)
* [cserver.permitJoin()](#API_permitJoin)
* [cserver.find()](#API_find)
* [cserver.removeNode()](#API_removeNode)
* [cserver.announce()](#API_announce)
* Events: [ready](#EVT_ready), [ind](#EVT_ind), and [error](#EVT_error)

#### 2. CoapNode APIs
>**cnode** denotes the instance of this class.

* [cnode.read()](#API_read)
* [cnode.discover()](#API_discover)
* [cnode.write()](#API_write)
* [cnode.writeAttr()](#API_writeAttr)
* [cnode.execute()](#API_execute)
* [cnode.observe()](#API_observe)
* [cnode.cancelObserve()](#API_cancelObserve)
* [cnode.ping()](#API_ping)
* [cnode.dump()](#API_dump)

*************************************************
## CoapShepherd Class
Exposed by `require('coap-shepherd')`. All the server configuration is read from the `config.js` file in the root of the project.

<a name="API_start"></a>
### cserver.start([callback])
Start the cserver.

**Arguments:**  

1. `callback` (_Function_): `function (err) { }` Get called after the starting program done.

**Returns:**  

* (none)

**Examples:** 

```js
cserver.start(function (err) {
    console.log('server start.');
});
```
*************************************************
<a name="API_stop"></a>
### cserver.stop([callback])
Stop the cserver.

**Arguments:**  

1. `callback` (_Function_): `function (err) { }` Get called after the stopping program done.

**Returns:**  

* (none)

**Examples:** 

```js
cserver.stop(function (err) {
    console.log('server stop.');
});
```
*************************************************
<a name="API_permitJoin"></a>
### cserver.permitJoin(time)
Open for devices to join the network. 

**Arguments:**  

1. `time` (_Number_): Timing in seconds for csever openning for devices to join the network. Set `time` to `0` can immediately close the admission.

**Returns:**  

* (none)

**Examples:** 

```js
cserver.API_permitJoin(300); 
```
*************************************************
<a name="API_find"></a>
### cserver.find(clientName)
Find the Client Device (cnode) in the cserver.

**Arguments:**  

1. `clientName` (_String_): Client name of the device to find.

**Returns:**  

* (Object): a cnode of clientName. Returns `undefined` if not found.

**Examples:** 

```js
var cnode = cserver.find('foo_Name');
```
*************************************************
<a name="API_removeNode"></a>
### cserver.removeNode(clientName[, callback])
Deregister and remove the Client Device (cnode) from the cserver.

**Arguments:**  

1. `clientName` (_String_): Client name of the device to remove.

2. `callback` (_Function_): `function (err) { }` Get called after the remove program done.

**Returns:**  

* (none)

**Examples:** 

```js
cserver.removeNode('foo_Name');
```
*************************************************
<a name="API_announce"></a>
### cserver.announce(msg[, callback])
The Server can use this method to announce messages.

**Arguments:**  

1. `msg` (_String_): The message to announce.

2. `callback` (_Function_): `function (err) { }` Get called after message announced.

**Returns:**  

* (none)

**Examples:** 

```js
cserver.announce('Hum!');
```
*************************************************
<a name="EVT_ready"></a>
### Event: 'ready'
`function () { }`
Fired when the Server is ready.

*************************************************
<a name="EVT_error"></a>
### Event: 'error'
`function (err) { }`
Fired when there is an error occurred.

*************************************************
<a name="EVT_ind"></a>
### Event: 'ind'
`function (type, msg) { }` Fired when there is an incoming indication message. There are 6 kinds of indication type including `registered`, `update`, `deregistered`, `online`, `offline` and `notify`.

* ##### registered
    * type: `'registered'`
    * msg (_Object_): a cnode of which Device is registering.
<br />

* ##### update
    * type: `'update'`
    * msg (_Object_): this object has field `device`,and may have fields of `lifetime`, `objList`, `ip`, `port`.
<br />

        ```js
        // example
        {
            device: 'foo_name',
            lifetime: 12000
        }
        ```

* ##### deregistered
    * type: `'deregistered'`
    * msg (_String_): the clientName of which Device is deregistering.
<br />

* ##### online
    * type: `'online'`
    * msg (_String_): the clientName of which Device is online.
<br />

* ##### offline
    * type: `'offline'`
    * msg (_String_): the clientName of which Device is offline.
<br />

* ##### notify
    * type: `'notify'`
    * msg (_Object_): the notification from the Client Device. This object has fileds of `device`, `path`, and `data`.

        ```js
        // example of a Resource notification
        {
            device: 'foo_name',
            path: '/temperature/0/sensorValue',
            data: 21
        }

        // example of an Object Instance notification
        {
            device: 'foo_name',
            path: '/temperature/0',
            data: {
                sensorValue: 21
            }
        }
        ```

***********************************************
<br /> 

## CoapNode Class
A registered Client Device is an instance of this class. Such an instance is denoted as `cnode` in this document. This class provides you with methods to perform remote operations upon a Client Device. The `cnode` device can be found by `cserver.find()`

<a name="API_read"></a>
### cnode.read(path[, callback])


**Arguments:**  

1. `path` (_String_): the path of the allocated Object, Object Instance or Resource on the remote Client Device.

2. `callback` (_Function_): `function (err, msg) { }`

**Returns:**  

* (none)

**Examples:** 

```js
cnode.read('/temperature/0/sensedValue', function (err, msg) {
    console.log(msg);   // { status: '2.05', data: 21 }
});

// target not found
cnode.read('/temperature/0/foo', function (err, msg) {
    console.log(msg);   // { status: '4.04' }
});

// target is unreadable
cnode.read('/temperature/0/bar', function (err, msg) {
    console.log(msg);   // { status: '4.05', data: '_unreadable_' }
});
```
*************************************************
<a name="API_discover"></a>
### cnode.discover(path[, callback])


**Arguments:**  

1. `path` (_String_): the path of the allocated Object, Object Instance or Resource on the remote Client Device.

2. `callback` (_Function_): `function (err, msg) { }`

**Returns:**  

* (none)

**Examples:** 

```js
// discover a Resource
cnode.discover('/temperature/0/sensedValue', function (err, msg) {
    console.log(msg);   // { status: '2.05', data: {
                        //                    attrs: { pmin: 10, pmax: 90, gt: 0 }
                        //                }
                        // }
});

// discover an Object
cnode.discover('/temperature', function (err, msg) {
    console.log(msg);   // { status: '2.05', data: {
                        //                    attrs: { pmin: 1, pmax: 60 },
                        //                    resrcList: {
                        //                        0: [ 5700, 5701 ]
                        //                    }
                        //                }
                        // }

// target not found
cnode.discover('/temperature/0/foo', function (err, msg) {
    console.log(msg);   // { status: '4.04' }
});
```
*************************************************
<a name="API_write"></a>
### cnode.write(path, data[, callback])


**Arguments:**  

1. `path` (_String_): the path of the allocated Object Instance or Resource on the remote Client Device.

2. `data` (_Depends_): 

3. `callback` (_Function_): `function (err, msg) { }`

**Returns:**  

* (none)

**Examples:** 

```js
cnode.write('/temperature/0/sensedValue', 19, function (err, msg) {
    console.log(msg);   // { status: '2.04' }
});

// target not found
cnode.write('/temperature/0/foo', 19, function (err, msg) {
    console.log(msg);   // { status: '4.04' }
});

// target is unwritable
cnode.write('/temperature/0/bar', 19, function (err, msg) {
    console.log(msg);   // { status: '4.05' }
});
```
*************************************************
<a name="API_writeAttr"></a>
### cnode.writeAttr(path, attrs[, callback])


**Arguments:**  

1. `path` (_String_): the path of the allocated Object, Object Instance or Resource on the remote Client Device.

2. `attrs` (_Object_): 

3. `callback` (_Function_): `function (err, msg) { }`

**Returns:**  

* (none)

**Examples:** 

```js
cnode.writeAttr('temperature/0/sensedValue', { pmin: 10, pmax: 90, gt: 0 }, function (err, msg) {
    console.log(msg);   // { status: '2.04' }
});

// taget not found
cnode.writeAttr('temperature/0/foo', { lt: 100 }, function (err, msg) {
    console.log(msg);   // { status: '4.04' }
});

// parameter cannot be recognized
cnode.writeAttr('temperature/0/sensedValue', { foo: 0 }, function (err, msg) {
    console.log(msg);   // { status: '4.00' }
});
```
*************************************************
<a name="API_execute"></a>
### cnode.execute(path[, args][, callback])


**Arguments:**  

1. `path` (_String_): the path of the allocated Resource on the remote Client Device.

2. `args` (_Array_): 

3. `callback` (_Function_): `function (err, msg) { }`

**Returns:**  

* (none)

**Examples:** 

```js
// assume there in an executable Resource with the singnatue
// function(t) { ... } to blink an LED t times.
cnode.execute('/led/0/blink', [ 10 ] ,function (err, msg) {
    console.log(msg);   // { status: '2.04' }
});

// target not found
cnode.execute('/temperature/0/foo', function (err, msg) {
    console.log(msg);   // { status: '4.04' }
});

// target is unexecuteable
cnode.execute('/temperature/0/bar', function (err, msg) {
    console.log(msg);   // { status: '4.05' }
});
```
*************************************************
<a name="API_observe"></a>
### cnode.observe(path[, callback])


**Arguments:**  

1. `path` (_String_): the path of the allocated Object, Object Instance or Resource on the remote Client Device.

2. `callback` (_Function_): `function (err, msg) { }`

**Returns:**  

* (none)

**Examples:** 

```js
cnode.observe('temperature/0/sensedValue', function (err, msg) {
    console.log(msg);   // { status: '2.05', data: 19 }
});

// target not found
cnode.observe('/temperature/0/foo', function (err, msg) {
    console.log(msg);   // { status: '4.04' }
});

// target is not allowed for observation
cnode.observe('/temperature/0/bar', function (err, msg) {
    console.log(msg);   // { status: '4.05' }
});

// target has been observed
cnode.observe('/temperature/0/sensedValue', function (err, msg) {
    console.log(err);   // Error['/temperature/0/bar has been observed.']
});
```
*************************************************
<a name="API_cancelObserve"></a>
### cnode.cancelObserve(path[, callback])


**Arguments:**  

1. `path` (_String_): the path of the allocated Object, Object Instance or Resource on the remote Client Device.

2. `callback` (_Function_): `function (err, msg) { }`

**Returns:**  

* (none)

**Examples:** 

```js
cnode.cancelObserve('temperature/0/sensedValue', function (err, msg) {
    console.log(msg);   // { status: '2.05' }
});

// target has not yet been observed
cnode.cancelObserve('/temperature/0/foo', function (err, msg) {
    console.log(err);   // Error['/temperature/0/bar has not yet been observed.']
});
```
*************************************************
<a name="API_ping"></a>
### cnode.ping([callback])


**Arguments:**  

1. `callback` (_Function_): `function (err, msg) { }`

**Returns:**  

* (none)

**Examples:** 

```js
cnode.ping(function (err, msg) {
    console.log(msg);   // { status: '2.05', data: 10 }
});
```
*************************************************
<a name="API_dump"></a>
### cnode.dump()


**Arguments:**  

1. none

**Returns:**  

* (_Object_):

**Examples:** 

```js
console.log(cnode.dump());

/*
{
    'clientName': 'foo_Name',
    'locationPath': '/rd/1',
    'lifetime': 86400,
    'version': '1.0.0',
    'ip': '127.0.0.1',
    'port': 56643,
    'objList': {
        '1':['0'],
        '3303':['0']
    },
    'so': {
        'lwm2mServer': {
            '0': { 
                'lifetimev:86400,
                'defaultMinPeriod':1,
                'defaultMaxPeriod':60
            }
        },
        'temperature': {
            '0': { 
                'sensorValue':19,
                'units':'C'
            }
        }
    }
}
*/
```

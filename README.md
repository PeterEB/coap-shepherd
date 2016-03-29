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

[**CoAP**](https://tools.ietf.org/html/rfc7252) is an application layer protocol based on RESTful intended to be used in resource constrained internet devices such as M2M or IoT that allows them to communicate interactively over the Internet. [**OMA Lightweight M2M**](http://technical.openmobilealliance.org/Technical/technical-information/release-program/current-releases/oma-lightweightm2m-v1-0) (LWM2M) is a resource constrained device management protocol relies on **CoAP**. 

**coap-shepherd** is an implementation of **CoAP** device management Server with Node.js that follows part of **LWM2M** specification to achieve machine network management. This library uses the [**IPSO**](http://www.ipso-alliance.org/smart-object-guidelines/) data model, which requires only simple and semantic URI addressing to allocate and query Resources on Client Devices. In the following example, these requests is to read the value from a same Resource but with different style of the path.

```js
// path in number style
//          /oid/iid/rid
cnode.read('/3303/0/5700', function (err, msg) {
    console.log(msg);   // { status: '2.05', data: 21 }
});

// path in semantic style
//                 /oid/iid/rid
cnode.read('/temperature/0/sensedValue', function (err, msg) {
    console.log(msg);   // { status: '2.05', data: 21 }
});

// path in hybrid style
//                 /oid/iid/rid
cnode.read('/temperature/0/5700', function (err, msg) {
    console.log(msg);   // { status: '2.05', data: 21 }
});
```

Note: you can find all pre-defined IPSO/OMA-LWM2M ids in library [lwm2m-id](https://github.com/simenkid/lwm2m-id#5-table-of-identifiers).

The goal of **coap-shepherd** is to provide a simple way to build and manage **CoAP** machine network ,it is implemented as a server-side application framework with many network management functions, e.g. permission of device joining, reading, writing and observing resources on a remote device, remotely executing a procedure on the Device. 

Note: [**coap-node**](https://github.com/PeterEB/coap-node) is implemented as a client of this library.

###Acronym

* oid: identifier of an Object
* iid: identifier of an Object Instance
* rid: indetifier of a Resource

<a name="Features"></a>
## 2. Features

* CoAP protocol
* Based on library [node-coap](https://github.com/mcollina/node-coap)
* LWM2M interfaces for Client/Server interaction
* Smart-Object-style (IPSO)

<a name="Installation"></a>
## 3. Installation

> $ npm install coap-shepherd --save

<a name="Usage"></a>
## 4. Usage

The following example starts a Server and opens permitJoin for devices to join in:

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
>**cserver** denotes a singleton exported by `require('coap-shepherd')`.

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

Note: The type _Depends_ meaning depends the type of target.

*************************************************
## CoapShepherd Class
Exposed by `require('coap-shepherd')`. All the Server configuration is read from the `config.js` file in the root of the project.

<a name="API_start"></a>
### cserver.start([callback])
Start the cserver.

**Arguments:**  

1. `callback` (_Function_): `function (err) { }` Get called after the starting procedure done.

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

1. `callback` (_Function_): `function (err) { }` Get called after the stopping procedure done.

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

2. `callback` (_Function_): `function (err) { }` Get called after the remove procedure done.

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
A registered Client Device is an instance of this class. This class provides you with methods to perform remote operations upon a Client Device. The `cnode` device can be found by `cserver.find()`

<a name="API_read"></a>
### cnode.read(path[, callback])
Read an Object, an Object Instance, or a Resource on the Client Device.

**Arguments:**  

1. `path` (_String_): the path of the allocated Object, Object Instance or Resource on the remote Client Device.

2. `callback` (_Function_): `function (err, msg) { }` Get called along with the response message. `msg` is response message object with status code:

    * `msg.status` (_String_): Status code of the response. The descriptions of status code are given in the following table.

        | msg.status | Status Code | Description |
        |------------|-------------|-------------|
        | 2.05       | Content     | Read operation is completed successfully. |
        | 4.04       | Not Found   | The target is not found on the Client.    |
        | 4.05       | Not Allowed | Target is not allowed for Read operation. |
        | 4.08       | Timeout     | No response from the Client in 60 secs.   |

    * `msg.data` (_Depends_): `data` can be the value of an Object, an Object Instance or a Resource. Note that when an unreadable Resource is read, the returned value will be a string '\_unreadble\_'.

**Returns:**  

* (none)

**Examples:** 

```js
// read from a Resource
cnode.read('/temperature/0/sensedValue', function (err, msg) {
    console.log(msg);   // { status: '2.05', data: 21 }
});

// read from a Object Instance
cnode.read('/temperature/0', function (err, msg) {
    console.log(msg);   // { status: '2.05', data: { 
                        //                       sensedValue: 21 
                        //                   } 
                        // }
});

// read from a Object
cnode.read('/temperature', function (err, msg) {
    console.log(msg);   // { status: '2.05', data: { 
                        //                       0: { 
                        //                             sensedValue: 21 
                        //                         } 
                        //                   } 
                        // }
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
Discover report settings an Object, an Object Instance, or a Resource and resource list of an Object or an Object Instance on the Client Device.

**Arguments:**  

1. `path` (_String_): the path of the allocated Object, Object Instance or Resource on the remote Client Device.

2. `callback` (_Function_): `function (err, msg) { }` Get called along with the response message. `msg` is response message object with status code:

    * `msg.status` (_String_): Status code of the response. The descriptions of status code are given in the following table.

        | msg.status | Status Code | Description |
        |------------|-------------|-------------|
        | 2.05       | Content     | Discover operation is completed successfully. |
        | 4.04       | Not Found   | The target is not found on the Client.        |
        | 4.08       | Timeout     | No response from the Client in 60 secs.       |

    * `msg.data` (_Object_): The field `attrs` is the object contains the parameter. If the discoved target is an Object or an Object Instance, there will be another field `resrcList`.

**Returns:**  

* (none)

**Examples:** 

```js
// discover a Resource
cnode.discover('/temperature/0/sensedValue', function (err, msg) {
    console.log(msg);   // { status: '2.05', data: {
                        //                       attrs: { pmin: 10, pmax: 90, gt: 0 }
                        //                }
                        // }
});

// discover an Object
cnode.discover('/temperature', function (err, msg) {
    console.log(msg);   // { status: '2.05', data: {
                        //                       attrs: { pmin: 1, pmax: 60 },
                        //                       resrcList: { 0: [ 'sensorValue', 'units' ] }
                        //                   }
                        // }

// target not found
cnode.discover('/temperature/0/foo', function (err, msg) {
    console.log(msg);   // { status: '4.04' }
});
```
*************************************************
<a name="API_write"></a>
### cnode.write(path, data[, callback])
Write the data to a Resource on the Client Device.

**Arguments:**  

1. `path` (_String_): the path of the allocated Object Instance or Resource on the remote Client Device.

2. `data` (_Depends_): the data to write to the target.

3. `callback` (_Function_): `function (err, msg) { }` Get called along with the response message. `msg` is response message object with status code:

    * `msg.status` (_String_): Status code of the response. The descriptions of status code are given in the following table.

        | msg.status | Status Code | Description |
        |------------|-------------|-------------|
        | 2.04       | Changed     | Write operation is completed successfully.     |
        | 4.00       | Bad Request | The format of data to be written is different. |
        | 4.04       | Not Found   | The target is not found on the Client.         |
        | 4.05       | Not Allowed | Target is not allowed for Write operation.     |
        | 4.08       | Timeout     | No response from the Client in 60 secs.        |

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
Configure the parameters of the report settings upon an Object, an Object Instance, or a Resource.

**Arguments:**  

1. `path` (_String_): the path of the allocated Object, Object Instance or Resource on the remote Client Device.

2. `attrs` (_Object_): parameters of report settings.

    | Property | Type   | Required | Description |
    |----------|--------|----------|-------------|
    | `pmin`   | Number | No       | Minimum Period. Minimum time in seconds the Client Device should wait between two notifications. |
    | `pmax`   | Number | No       | Maximum Period. Maximum time in seconds the Client Device should wait between two notifications. When maximum time expires after the last notification, a new notification should be sent. |
    | `gt`     | Number | No       | Greater Than. The Client Device should notify the Server Device each time the Observed Resource value crosses the Greater Than Attribute value with respect to pmin parameter. |
    | `lt`     | Number | No       | Less Than. The Client Device should notify the Server Device each time the Observed Resource value crosses the Less Than Attribute value with respect to pmin parameter. |
    | `stp`    | Number | No       | Step. The Client Device should notify the Server Device when the value variation since the last notification of the Observed Resource, is greater or equal to the Step Attribute value. |

3. `callback` (_Function_): `function (err, msg) { }` Get called along with the response message. `msg` is response message object with status code:

    * `msg.status` (_String_): Status code of the response. The descriptions of status code are given in the following table.

        | msg.status | Status Code | Description |
        |------------|-------------|-------------|
        | 2.04       | Changed     | Write Attributes operation is completed successfully. |
        | 4.00       | Bad Request | The parameter of attribute can't be recognized.       |
        | 4.04       | Not Found   | The target is not found on the Client.                |
        | 4.08       | Timeout     | No response from the Client in 60 secs.               |

**Returns:**  

* (none)

**Examples:** 

```js
cnode.writeAttr('/temperature/0/sensedValue', { pmin: 10, pmax: 90, gt: 0 }, function (err, msg) {
    console.log(msg);   // { status: '2.04' }
});

// taget not found
cnode.writeAttr('/temperature/0/foo', { lt: 100 }, function (err, msg) {
    console.log(msg);   // { status: '4.04' }
});

// parameter cannot be recognized
cnode.writeAttr('/temperature/0/sensedValue', { foo: 0 }, function (err, msg) {
    console.log(msg);   // { status: '4.00' }
});
```
*************************************************
<a name="API_execute"></a>
### cnode.execute(path[, args][, callback])
Invoke an excutable Resource on the Client Device.

**Arguments:**  

1. `path` (_String_): the path of the allocated Resource on the remote Client Device.

2. `args` (_Array_): the arguments of the Execute operation.

3. `callback` (_Function_): `function (err, msg) { }` Get called along with the response message. `msg` is response message object with status code:

    * `msg.status` (_String_): Status code of the response. The descriptions of status code are given in the following table.

        | msg.status | Status Code | Description |
        |------------|-------------|-------------|
        | 2.04       | Changed     | Execute operation is completed successfully.               |
        | 4.00       | Bad Request | The Client doesn’t understand the argument in the payload. |
        | 4.04       | Not Found   | The target is not found on the Client.                     |
        | 4.05       | Not Allowed | Target is not allowed for Execute operation.               |
        | 4.08       | Timeout     | No response from the Client in 60 secs.                    |

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
Start observing a Resource on the Client Device.

**Arguments:**  

1. `path` (_String_): the path of the allocated Resource on the remote Client Device.

2. `callback` (_Function_): `function (err, msg) { }` Get called along with the response message. `msg` is response message object with status code:

    * `msg.status` (_String_): Status code of the response. The descriptions of status code are given in the following table.

        | msg.status | Status Code | Description |
        |------------|-------------|-------------|
        | 2.05       | Content     | Observe operation is completed successfully. |
        | 4.04       | Not Found   | The target is not found on the Client.       |
        | 4.05       | Not Allowed | Target is not allowed for Observe operation. |
        | 4.08       | Timeout     | No response from the Client in 60 secs.      |

   * `msg.data` (_Depends_): `data` can be the value of an Object, an Object Instance or a Resource. Note that when an unreadable Resource is observe, the returned value will be a string '\_unreadble\_'.

**Returns:**  

* (none)

**Examples:** 

```js
cnode.observe('/temperature/0/sensedValue', function (err, msg) {
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
End an observation relationship for Resource on the Client Device.

**Arguments:**  

1. `path` (_String_): the path of the allocated Object, Object Instance or Resource on the remote Client Device.

2. `callback` (_Function_): `function (err, msg) { }` Get called along with the response message. `msg` is response message object with status code:

    * `msg.status` (_String_): Status code of the response. The descriptions of status code are given in the following table.

        | msg.status | Status Code | Description |
        |------------|-------------|-------------|
        | 2.05       | Content     | Cancel Observe operation is completed successfully. |
        | 4.04       | Not Found   | The target is not found on the Client.              |
        | 4.08       | Timeout     | No response from the Client in 60 secs.             |

**Returns:**  

* (none)

**Examples:** 

```js
cnode.cancelObserve('/temperature/0/sensedValue', function (err, msg) {
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
Ping the Client Device.

**Arguments:**  

1. `callback` (_Function_): `function (err, msg) { }` Get called along with the response message. `msg` is response message object with status code:

    * `msg.status` (_String_): Status code of the response. The descriptions of status code are given in the following table.

        | msg.status | Status Code | Description |
        |------------|-------------|-------------|
        | 2.05       | Content     | Ping operation is completed successfully. |
        | 4.08       | Timeout     | No response from the Client in 60 secs.   |

    * `msg.data` (_String_): The approximate round trip time in milliseconds.

**Returns:**  

* (none)

**Examples:** 

```js
cnode.ping(function (err, msg) {
    console.log(msg);   // { status: '2.05', data: '10ms' }
});
```
*************************************************
<a name="API_dump"></a>
### cnode.dump()
Dump the record of the Client Device.

**Arguments:**  

1. none

**Returns:**  

* (_Object_): A data object of cnode record.

    |   Property   |  Type   |  Description  |
    |--------------|---------|---------------|
    | `clientName` | String  | Client name of the device.                                                  |
    | `ip`         | String  | Ip address of the device.                                                   |
    | `port`       | Number  | Port of the device.                                                         |
    | `lifetime`   | Number  | Lifetime of the device.                                                     |
    | `version`    | String  | LWM2M version.                                                              |
    | `objList`    | Object  | The list of Objects supported and Object Instances available on the device. |
    | `so`         | Object  | All of the Objects, Object Instances and Resources.                         |

**Examples:** 

```js
console.log(cnode.dump());

/*
{
    'clientName': 'foo_Name',
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

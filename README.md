# Disco
Network discovery, messaging and events.

  [![Build Status](https://secure.travis-ci.org/diversario/node-disco.png?branch=develop)](http://travis-ci.org/diversario/node-disco)
  [![Coverage Status](https://coveralls.io/repos/diversario/node-disco/badge.png?branch=develop)](https://coveralls.io/r/diversario/node-disco?branch=develop)
  [![Dependency Status](https://gemnasium.com/diversario/node-disco.png)](https://gemnasium.com/diversario/node-disco)
  [![NPM version](https://badge.fury.io/js/node-disco.png)](http://badge.fury.io/js/node-disco)

```
npm install disco
```
## How it works
`disco` utilizes `eventcast` module to advertise themselves on the network. Advertisement messages may contain information that recipient would need to connect to sender through something other than UDP or anything else.

Messages can be of any (reasonable) size because `eventcast` fragments messages over 1KB in size and reassembles them. Of course, it's best to keep them short and sweet.

The goal of `disco` is to provide node discovery over the network and monitor discovered node's health. Use `disco` as a part of your project.

## Usage

Create an instance of `disco` and start it:

```javascript
var disco = Disco(9000) // port 9000

disco.on('discovery', function(msg){
  // handle message
})

disco.start()
```

By default, `msg` will contain sender's host, port and id.

`disco` maintains a list of discovered nodes. Each node provides host, port, id, hostname and the last received message. Nodes also have phi accrual failure detector attached to them that can be used to monitor node's availability.

## REPL
`disco` creates a REPL that provides access to all instance methods and properties. REPL binds to a random port unless `replPort` is passed to the constructor.

```
$ telnet localhost 20001
Trying 127.0.0.1...
Connected to localhost.
Escape character is '^]'.
disco> disco.stop()
true
disco>
```

## Configuration
TODO

## API
###start([callback])
Starts `disco` instance and calls `callback`, if provided.

###stop([callback])
Stops `disco` instance and calls `callback`, if provided.

###set(event, [message], [handler])
- `event` _String_ | _Object_ If `event` is a string - default interval will be used, otherwise `event.name` and `event.interval`  are required.
- `message` * _optional_ Message to pass with the event. Can be anything serializable.
- `handler` _Function_ _optional_ Handler function for this event. If omitted, event will be emitted on `disco` instance.

Attach an event that will fire on interval with provided `message`. When received, `message` will be passed to `handler` or emitted on `disco` instance.

###unset(event)
 - `event` _String_ event name
 
 Removes `event`.
 
###discovery(message, handler)
- `message` * Discovery message
- `handler` _Function_ Discovery message handler. Called with event name ("discovery") and the message.

Overrides the default discovery message and handler.

###getNodes
Returns an array of known nodes.

##Nodes
Nodes returned by `Disco#getNodes` represent instances of `disco` that this instance is aware of. Node object contains:

- `id` Node ID.
- `host` Node host
- `port` Node port
- `info` Last received discovery message
- `phi` A function that returns suspicion level for this node.
 
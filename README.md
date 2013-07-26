# Disco
Network discovery, messaging and events.

  [![Build Status](https://secure.travis-ci.org/diversario/node-disco.png?branch=develop)](http://travis-ci.org/diversario/node-disco)
  [![Coverage Status](https://coveralls.io/repos/diversario/node-disco/badge.png?branch=develop)](https://coveralls.io/r/diversario/node-disco?branch=develop)
  [![Dependency Status](https://gemnasium.com/diversario/node-disco.png)](https://gemnasium.com/diversario/node-disco)
  [![NPM version](https://badge.fury.io/js/node-disco.png)](http://badge.fury.io/js/node-disco)

```
npm install disco
```da
## How it works
`disco` instances use UDP multicast to advertise themselves on the network. Advertisement messages may contain information that recipient would need to connect to sender through something other than UDP or anything else.

Currently, message size is limited to ~1500 bytes, but support for multipart messages is being researched. Even with this limitation there's enough room for useful data.

The goal of `disco` is to provide a network event emitter where nodes can dynamically subscribe to events and exchange data. Use `disco` as a part of your project.

## Usage

Create an instance of `disco` and add some events:

```javascript
var disco = Disco(9000) // port 9000

disco.set('myevent', 'hello', function(msg){
    console.log(msg.payload()) // prints 'hello'
})

disco.start()
```

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
var crypto = require('crypto')
  , EE = require('events').EventEmitter
  , util = require('util')
  , os = require('os')

  , _ = require('lodash')
  , ip = require('ip')
  , repl = require('replize')
  
  , Eventcast = require('eventcast')
  
  , Node = require('./Node')
  , NodeList = require('./NodeList')
  , Event = require('./Event')
  , EventList = require('./EventList')
  
  , Logger = require('./Logger')

module.exports = Disco



/**
 * Default configuration values
 */
var defaultConfig = {
  address: '', // = '0.0.0.0'
  port: null, // random
  
  defaultInterval: 1000,
  discoveryInterval: 1000,
  
  multicastMembership: '239.255.255.250',
  multicastInterface: null,
  multicastLoopback: true, // must be enabled for multiple instances to see each other on the same machine
  multicastTtl: 3,
  
  replPort: null, // random
  replHost: 'localhost',
  replEnabled: false,
  
  encrypt: false
}



/**
 * @param {Object|Number} opts Options map that overrides default configuration
 *  or a port number.
 * @returns {Disco}
 * @constructor
 */
function Disco(opts) {
  if (!(this instanceof Disco)) {
    return new Disco(opts)
  }

  EE.call(this)
  
  this._init(opts)
  if (this.config.replEnabled) this._startRepl()
}

util.inherits(Disco, EE)


/**
 * Initialized this instance with optional `opts`.
 * 
 * @param {Object|Number} [opts]
 * @private
 */
Disco.prototype._init = function _init(opts) {
  if (typeof opts == 'number') opts = {port: opts}
  
  this.config = _.extend(_.cloneDeep(defaultConfig), _.cloneDeep(opts || {}))

  this.config.port = this.config.port || getRandomPort()
  this.config.replPort = this.config.replPort || getRandomPort()
  this.config.id = this.config.id || crypto.randomBytes(8).toString('hex')

  var ecConfig = _.cloneDeep(this.config)
  ecConfig.replEnabled = false
  this.eventcast = new Eventcast(ecConfig)
  
  // create logger instance after configuration is completed
  this.log = Logger(this.config)
  
  Object.defineProperty(this, 'id', {
    'value': this.config.id,
    'writable': false
  })

  this.node = new Node({
    id: this.id,
    host: this.getAddress().host,
    port: this.getAddress().port
  })
  
  this._nodes = new NodeList(this.node)
  this._events = new EventList
  
  this._attachDiscoveryProbe()
  
  this._setStatus('stopped')
  
  this.log.disco.debug('Disco instance created')
}



/**
 * Sets log level.
 * 
 * @param {String} [component] Logger to set level for, e.g. 'disco', 'repl'. Defaults to 'disco'.
 * @param {String} level Log level - TRACE, DEBUG, INFO, WARN, ERROR, FATAL 
 */
Disco.prototype.logLevel = function logLevel(component, level) {
  if (!component && !level) return this.log.disco.levels()
  
  if (!level) {
    level = component
    component = 'disco'
  }
  
  if (typeof level == 'string' && this.log._logger[level]) {
    this.log[component].level(level)
  } else {
    this.log.disco.warn('Unknown log level "' + level + '".')
  }
}



Disco.prototype._startRepl = function _startRepl() {
  var self = this

  this.repl = repl({
    port: this.config.replPort,
    host: this.config.replHost,
    context: {disco: self},
    prompt: 'disco@' + os.hostname() + '> '
  })

  this.repl.on('replConnected', function (c) {
    self.emit('replConnected')
    self.log.repl.info('Client connected. Total clients:', c)
  })

  this.repl.on('replDisconnected', function (c) {
    self.emit('replDisconnected')
    self.log.repl.info('Client disconnected. Total clients:', c)
  })

  this.clients = this.repl.clients.bind(this.repl)

  this.repl.start()
}



/**
 * Attaches discovery probe.
 * If called with no arguments - attaches a default
 * discovery probe and default payload.
 * On discovery adds a new node to the list.
 * 
 * @param {*} payload 'discover' event payload
 * @param {Function} fn 'discover' event handler
 * 
 * @private
 */
Disco.prototype._attachDiscoveryProbe = function _attachDiscoveryProbe(payload, fn) {
  if (!fn && typeof payload == 'function') {
    fn = payload
    payload = null
  }
  
  if (typeof fn == 'function') {
    var customProbe = function (evtName, msg) {
      this._failureDetector(msg)    
      fn.call(this, msg)
    }
  }
  
  this.set(
    {
      name: 'discovery',
      interval: this.config.discoveryInterval
    },
    payload,
    (customProbe && customProbe.bind(this, 'discovery')) || this._defaultEventHandler.bind(this, 'discovery')
  )
  
  this.log.disco.debug('Discovery probe attached.')
}



/**
 * Default event handler.
 * 
 * @param evtName
 * @param msg
 * @private
 */
Disco.prototype._defaultEventHandler = function _defaultEventHandler(evtName, msg) {
  this._failureDetector(msg)
  this.emit(evtName, msg)
}

Disco.prototype._failureDetector = function (msg) {
  var node = new Node({
    id: msg.node.id,
    host: msg.node.host,
    port: msg.node.port,
    info: msg.payload
  })

  if (this._nodes.contains(node)) {
    var existingNode = this._nodes.find(node)
    existingNode.update(node)
  } else {
    this._addNode(node)
  }
}


/**
 * Sets custom discovery event payload and handler
 * 
 * @param payload
 * @param handler
 */
Disco.prototype.discovery = function discovery(payload, handler) {
  this._attachDiscoveryProbe(payload, handler)
}



/**
 * Returns a list of known nodes.
 * @returns {Array}
 */
Disco.prototype.getNodes = function () {
  return this._nodes.toArray()
}



/**
 * Adds a new node to the node list
 * @param nodeInfo
 */
Disco.prototype._addNode = function (nodeInfo) {
  var node = new Node(nodeInfo)
  this._nodes.add(node)
}



/**
 * Removes a node from known nodes list. 
 * @param nodeInfo
 */
Disco.prototype._removeNode = function (nodeInfo) {
  var node = new Node(nodeInfo)
  this._nodes.remove(node)
}



/**
 * Schedules a message `event.name` to be sent out every `event.interval` ms
 * with an optional `payload`. `handler` is a function to invoke
 * when this message is received on this node (i. e., a callback).
 *
 * @param evtObject
 * @param _payload
 * @param handler
 */
Disco.prototype.set = function (evtObject, _payload, handler) {
  if (typeof evtObject == 'string') {
    evtObject = {
      name: evtObject, 
      interval: this.config.defaultInterval
    }
  }

  var message = {
    node: this.node,
    payload: _payload || null
  }
  
  var event = new Event({
    name: evtObject.name,
    interval: evtObject.interval,
    payload: message,
    handler: handler || this._defaultEventHandler.bind(this, evtObject.name),
    timer: null
  })
  
  if (this._events.contains(event)) {
    this.unset(event)
  }

  this._events.add(event)
}



/**
 * Removes and unschedules the event.
 * @param event
 */
Disco.prototype.unset = function (event) {
  event.unschedule()
  this._events.remove(event)
}



/**
 * Kicks off network activity.
 * Attaches `message` listener on the UDP server
 * from which messages are processed.
 * 
 * Binds server to port and attaches event handlers.
 */
Disco.prototype.start = function start(cb) {
  var self = this

  if (this.status != Disco.STOPPED) {
    cb && cb()
    return
  }

  this._events.each(function (event) {
    self.eventcast.on(event.name, function (message) {
      event.handler && event.handler.call(self, message)
    })
  })
  
  this.eventcast.start(function () {
    self._events.schedule(function (evt) {
      var p = {'node': evt.payload.node}
      
      if (evt.payload && typeof evt.payload.payload == 'function') {
        p.payload = evt.payload.payload()
      } else {
        p.payload = evt.payload.payload
      }
      
      self.eventcast.emit(evt.name, p)
    })
    
    self._setStatus(Disco.STARTED)
    
    cb && cb()
  })
}



/**
 * Unbinds the server, removes listeners,
 * stops event timers.
 */
Disco.prototype.stop = function stop(cb) {
  var self = this

  if (this.status != Disco.STARTED) {
    cb && cb()
    return
  }

  this._events.each(function (event) {
    self.eventcast.removeAllListeners(event.name)
  })

  this._events.unschedule()
  
  this.eventcast.stop(function () {
    self._setStatus(Disco.STOPPED)
    cb && cb()
  })
}



/**
 * Sets `status` property on the instance and emits `status` value.
 * 
 * @param {String} status Status to set
 * @private
 */
Disco.prototype._setStatus = function _setStatus(status) {
  switch (status) {
    case 'stopped':
      this.emit('stop')
      break
    case 'started':
      this.emit('start')
      break
    default:
      throw new Error('Status "' + status + '" is not valid.')
  }

  this.status = status
}



/**
 * Returns `host:port` string for `this` instance. 
 * @returns {Object}
 */
Disco.prototype.getAddress = function () {
  return {
    host: ip.address(),
    port: this.config.port
  }
}


Disco.STARTED = 'started'
Disco.STOPPED = 'stopped'



/**
 * Returns random port number between 49152 and 65535 (by default).
 * Defaults are based on RFC6335, section 6.
 *
 * @param {Number} [min]
 * @param {Number} [max]
 * @return {Number}
 */
function getRandomPort(min, max) {
  if (min == null) min = 49152
  if (max == null) max = 65535 - 1 // -1 to leave 1 port for REPL

  return min + Math.floor(Math.random() * (max - min + 1))
}


if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() == 'test') {
  module.exports.getRandomPort = getRandomPort
}
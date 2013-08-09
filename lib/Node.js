'use strict'

var FailureDetector = require('failure-detector').FailureDetector

/**
 * @fileOverview Node represents an instance of Disco server.
 */

module.exports = Node

function Node(data) {
  if (!data.id) throw new Error('Node ID is required')
  
  this.id = data.id
  this.host = data.host || null
  this.port = data.port || null
  
  this.info = data.info || null

  this.fd = new FailureDetector
}

Node.prototype.update = function (_node) {
  this.info = _node.info
  this.fd.report()
}
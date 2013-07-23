'use strict'

/**
 * @fileOverview Node represents an instance of Disco server.
 */

module.exports = Node

function Node(info) {
  if (!info.id) throw new Error('Node ID is required')
  
  this.id = info.id
  this.host = info.host || null
  this.port = info.port || null
}
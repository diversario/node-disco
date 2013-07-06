'use strict'

module.exports = EventList

var Event = require('./Event')
  , List = require('./List')

  , util = require('util')

function EventList(event) {
  List.call(this, event)
}

util.inherits(EventList, List)



/**
 * Schedules every event to run periodically.
 * Unschedules event before scheduling.
 */
EventList.prototype.schedule = function (fn) {
  this.each(function (event) {
    event.unschedule()
    event.schedule(fn)
  })
}



/**
 * Stops event execution.
 */
EventList.prototype.unschedule = function () {
  this.each(function (event) {
    event.unschedule()
  })
}

EventList.prototype.equal = function (event, name) {
  return event.name === name
}

EventList.prototype.wrap = function (evt) {
  if (!(evt instanceof Event)) {
    return new Event(evt)
  }

  return evt
}
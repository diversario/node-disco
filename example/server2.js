var Disco = require('../')

var server = Disco({
  discoveryInterval: 3000,
  port:19999, 
  multicastLoopback: true,
  multicastMembership: '224.192.1.1',
  replPort: 20002
})

server.start()

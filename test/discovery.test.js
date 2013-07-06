var Disco = require('../')
  , assert = require('assert')



describe('Default announcements', function () {
  function getOpts(custom) {
    var opts = {
      port: custom && custom.port || Disco.getRandomPort()
    }
    
    custom && Object.keys(custom).forEach(function (k) {
      opts[k] = custom[k]
    })
    
    return opts
  }
  
  describe('Two instances', function () {
    it('emit messages', function (done) {
      var opts = getOpts()
        , server1 = new Disco(opts)
        , server2 = new Disco(opts)
        , messageCount = 0

      assert.notEqual(server1.id, server2.id)

      ;[server1, server2].forEach(function(server){
        server.on('disco:announce', function(msg){
          assert(/^hello$/.test(msg.payload))
          if (++messageCount == 2) {
            server1.stop(function(){
              server2.stop(done)
            })
          }
        })
      })

      server1.start(function(){
        server2.start()
      })
    })

    it('register each other', function (done) {
      var opts = getOpts()
        , server1 = new Disco(opts)
        , server2 = new Disco(opts)
        , messageCount = 0

      assert.notEqual(server1.id, server2.id)

      ;[server1, server2].forEach(function(server){
        server.on('disco:announce', function(msg){
          assert(/^hello$/.test(msg.payload))
          if (++messageCount == 6) {
            getNodeList()
          }
        })
      })

      function getNodeList() {
        var list1 = server1.nodes.toArray()
          , list2 = server2.nodes.toArray()
        
        list1.sort(function (a, b) {
          return (a.id < b.id) ? -1 : 1
        })
        
        list2.sort(function (a, b) {
          return (a.id < b.id) ? -1 : 1
        })

        assert.deepEqual(list1, list2)
        
        server1.stop(function(){
          server2.stop(done)
        })
      }
      
      server1.start(function(){
        server2.start()
      })
    })


    it('can see each other, encrypted body', function (done) {
      var opts = getOpts({encrypt: {'key': 'qwqweqweqweq'}})
        , server1 = new Disco(opts)
        , server2 = new Disco(opts)
        , messageCount = 0
      
      assert.notEqual(server1.id, server2.id)
      
      server1.set({name: 'message', interval: 2000}, 'default discovery message')
      server2.set({name: 'message', interval: 2000}, 'default discovery message')
      
      ;[server1, server2].forEach(function(server){
        server.on('message', function(msg){
          assert(/default discovery/i.test(msg.payload))
          if (++messageCount == 2) {
            server1.stop(function(){
              server2.stop(done)
            })
          }
        })
      })
      
      server1.start(function(){
        server2.start()
      })
    })
    
    it('do not interfere with each other, plaintext body', function (done) {
      var opts = getOpts()
        , server1 = Disco(opts)
        , server2 = Disco(opts)
        , messageCount = 0

      assert.notEqual(server1.id, server2.id)

      server1.set({name: 'message', interval: 2000}, 'default discovery message')
      server2.set({name: 'message', interval: 2000}, 'default discovery message')
      
      ;[server1, server2].forEach(function(server){
        server.on('message', function(msg){
          assert(/default discovery/i.test(msg.payload))
          if (++messageCount == 2) {
            server1.stop(function(){
              server2.stop(done)
            })
          }
        })
      })

      server1.start(function(){
        server2.start();
      });
    })
  })
})

const http = require('http')
const querystring = require('querystring')

var constructQ = querystring.stringify({
  'query': 'construct {?t ?s ?r .} WHERE {?t ?s ?r .}'
})

var doConstructRequest = function (opt) {
  return new Promise(function (resolve, reject) {
    const query = opt.query
    var options = {
      hostname: 'localhost',
      port: 8080,
      path: '/rdf4j-server/repositories/tsrn',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(query),
        'Accept': 'application/n-quads'
      }
    }
    var req = http.request(options, (res) => {
      console.log(`STATUS: ${res.statusCode}`)
      console.log(`HEADERS: ${JSON.stringify(res.headers)}`)
      res.setEncoding('utf8')
      res.on('data', (chunk) => {
        console.log(`BODY: ${chunk}`)
      })
      res.on('end', () => {
        console.log('No more data in response.')
      })
    })
    req.on('error', (e) => {
      console.log(`problem with request: ${e.message}`)
    })
    // write data to request body
    req.write(query)
    req.end()
  })
}

doConstructRequest({'query': constructQ})


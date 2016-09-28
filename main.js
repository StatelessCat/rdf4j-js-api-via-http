const http = require('http')
const querystring = require('querystring')

var constructQ = querystring.stringify({
  'query': 'CONSTRUCT {?t ?s ?r .} WHERE {?t ?s ?r .}'
})

var doConstructRequest = function (opt) {
  return new Promise(function (resolve, reject) {
    const query = opt.query
    const verb = opt.verb
    var options = {
      hostname: 'localhost',
      port: 8080,
      path: '/rdf4j-server/repositories/tsrn',
      method: verb,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(query),
        'Accept': 'application/n-quads'
      }
    }
    var req = http.request(options, (res) => {
      var responseBody = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => {
        responseBody += chunk
      })
      res.on('end', () => {
        resolve({
          'body': responseBody,
          'status': res.statusCode,
          'headers': res.headers
        })
      })
    })
    req.on('error', (e) => {
      // console.log(`problem with request: ${e.message}`)
      reject(e)
    })
    // write data to request body
    req.write(query)
    req.end()
  })
}

doConstructRequest({'query': constructQ, verb: 'POST'}).then(function (res) {
  console.log(res)
})


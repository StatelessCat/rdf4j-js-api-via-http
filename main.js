const http = require('http')
const querystring = require('querystring')
const url = require('url')

var constructQ = querystring.stringify({
  'query': 'CONSTRUCT {?t ?s ?r .} WHERE {?t ?s ?r .}'
})

// TODO not application/x-www-form-urlencode ??
var insertDataQ = querystring.stringify({
  'update': 'INSERT DATA { <http://exampleSub> <http://examplePred> <http://exampleObj> .}'
})

var getStatementWithSubject = querystring.stringify({
  'action': 'GET',
  'subj': '<http://exampleSub>'
})

var doRequest = function (opt) {
  return new Promise(function (resolve, reject) {
    const query = opt.query || ''
    const verb = opt.verb
    const path = opt.path
    const contentType = opt.contentType
    var options = {
      hostname: 'localhost',
      port: 8080,
      path: path,
      method: verb,
      headers: {
        'Accept': 'text/x-nquads',
        'Content-Length': Buffer.byteLength(query)
      }
    }
    if (contentType) {
      options.headers['Content-Type'] = contentType
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
      console.log(`problem with request: ${e.message}`)
      reject(e)
    })
    // write data to request body
    req.write(query)
    req.end()
  })
}

// Read request
doRequest({
  path: '/rdf4j-server/repositories/tsrn',
  'contentType': 'application/x-www-form-urlencoded',
  'query': constructQ,
  verb: 'POST'
})
  .then(function (res) {
    console.log(res)

    // open a transaction
    return doRequest({
      path: '/rdf4j-server/repositories/tsrn/transactions',
      'contentType': 'application/x-www-form-urlencoded',
      verb: 'POST'
    })
  })
  .then(function (res) {
    // Location response headers contains the URI of the transaction
    const transactionUri = res.headers.location
    const transactionUriObject = url.parse(transactionUri)
    const transactionPathname = transactionUriObject.pathname

    console.log('OPENED transaction: ' + transactionPathname)
    doRequest({
      path: transactionPathname + '?' + getStatementWithSubject,
      verb: 'PUT'
    })
      .then(function (res) {
        console.log('###')
        console.log(res)
        console.log('###')
        return doRequest({path: transactionPathname + '?action=COMMIT', 'query': null, verb: 'PUT'})
      })
      .then(function (res) {
        console.log(res.status === 200)
        return doRequest({path: transactionPathname + '?action=COMMIT', 'query': null, verb: 'PUT'})
      })
      .then(function (res) {
        // Must be 500 error because transaction already commited
        console.log(res.status === 500)
        
      })
      .catch(function (err) {
        console.log(err)
      })
  })


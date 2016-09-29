const http = require('http')
const querystring = require('querystring')
const url = require('url')

var constructQ = querystring.stringify({
  'query': 'CONSTRUCT {?t ?s ?r .} WHERE {?t ?s ?r .}'
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

const openTransaction = function () {
  return new Promise(function (resolve, reject) {
    doRequest({
      path: '/rdf4j-server/repositories/tsrn/transactions',
      verb: 'POST'
    })
      .then(function (res) {
        // Location response headers contains the URI of the transaction
        const transactionUri = res.headers.location
        const transactionUriObject = url.parse(transactionUri)
        const transactionPathname = transactionUriObject.pathname
        console.log('OPENED transaction: ' + transactionPathname)
        resolve(transactionPathname)
      })
      .catch(function (err) {
        reject(err)
      })
  })
}

const commitTransaction = function (transactionPathname) {
  return doRequest({path: transactionPathname + '?action=COMMIT', 'query': null, verb: 'PUT'})
}

const constructQuery = function (opt) {
  const query = opt.query
  const path = opt.path
  return doRequest({
    path: path,
    'contentType': 'application/x-www-form-urlencoded',
    'query': query,
    verb: 'POST'
  })
}

const updateQuery = function (opt) {
  const query = opt.query
  const transactionPathname = opt.transactionPathname
  var updateQueryString = querystring.stringify({
    'action': 'UPDATE',
    'update': query
  })
  return doRequest({
    path: transactionPathname + '?' + updateQueryString,
    verb: 'PUT'
  })
}

// Read request
constructQuery({
  path: '/rdf4j-server/repositories/tsrn',
  'query': constructQ
})
  .then(function (res) {
    console.log(res)

    // open a transaction
    return openTransaction()
  })
  .then(function (transactionPathname) {
    // TRANSACTION beginned

    // 'INSERT DATA { <http://exampleSub> <http://examplePred> <http://exampleObj> .}'
    updateQuery({
      transactionPathname: transactionPathname,
      query: 'INSERT DATA { <http://exampleSubbb> <http://examplePred> <http://exampleObj> .}'
    })
      .then(function (res) {
        console.log(res.status)
        return commitTransaction(transactionPathname)
      })
      .then(function (res) {
        // TRANSACTION committed
        console.log(res.status === 200)
      })
      .catch(function (err) {
        console.log(err)
      })
  })


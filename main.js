const http = require('http')
const querystring = require('querystring')
const url = require('url')

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

// http://rdf4j.org/doc/the-rdf4j-server-rest-api/#Starting_transactions
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

// http://rdf4j.org/doc/the-rdf4j-server-rest-api/#The_COMMIT_operation
const commitTransaction = function (transactionPathname) {
  return doRequest({path: transactionPathname + '?action=COMMIT', 'query': null, verb: 'PUT'})
}

// http://rdf4j.org/doc/the-rdf4j-server-rest-api/#The_UPDATE_operation
const updateOperation = function (opt) {
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

// http://rdf4j.org/doc/the-rdf4j-server-rest-api/#The_QUERY_operation
const queryOperation = function (opt) {
  const query = opt.query
  const transactionPathname = opt.transactionPathname
  var queryQueryString = querystring.stringify({
    'action': 'QUERY',
    'query': query
  })
  return doRequest({
    path: transactionPathname + '?' + queryQueryString,
    verb: 'PUT'
  })
}

// TEST:
openTransaction()
  .then(function (transactionPathname) {
    // TRANSACTION beginned

    queryOperation({
      transactionPathname: transactionPathname,
      query: 'CONSTRUCT {?t ?s ?r .} WHERE { ?t ?s ?r .}'
    })
      .then(function (res) {
        console.log(res)
        // 'INSERT DATA { <http://exampleSub> <http://examplePred> <http://exampleObj> .}'
        return updateOperation({
          transactionPathname: transactionPathname,
          query: 'INSERT DATA { <http://exampleSubbb> <http://examplePred> <http://exampleObj> .}'
        })
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


const tap = require('tap')
const endpoints = require('./endpoints-id-names.json')
const endpointToIdName = require('./lib-endpoint-to-id-name')

const endpointsWithIdNames = endpoints.filter(e => e.idName)

endpointsWithIdNames.forEach(endpoint => {
  tap.test(`${endpoint.verb} ${endpoint.path} - ${endpoint.name}`, t => {
    t.equals(endpointToIdName(endpoint), endpoint.idName)
    t.end()
  })
})

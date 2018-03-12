const {resolve: resolvePath} = require('path')
const {readFileSync} = require('fs')

const {test} = require('tap')

const endpointHtmlToJson = require('../../../lib/endpoint/html-to-json')

const fixtures = {
  in: readFileSync(resolvePath(__dirname, 'in.html')),
  out: require('./out.json')
}

test('landing page HTML to routes.json', t => {
  const actual = endpointHtmlToJson(fixtures.in)
  t.deepEquals(actual, fixtures.out)
  t.end()
})

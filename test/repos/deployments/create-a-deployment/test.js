const {resolve: resolvePath} = require('path')
const {readFileSync} = require('fs')

const {test} = require('tap')

const endpointHtmlToJson = require('../../../../lib/endpoint/html-to-json')

const fixtures = {
  in: readFileSync(resolvePath(__dirname, 'in.html')),
  out: require('./out.json')
}

test('https://developer.github.com/v3/repos/deployments/#create-a-deployment to JSON', t => {
  const actual = endpointHtmlToJson(fixtures.in)
  t.deepEquals(actual, fixtures.out)
  t.end()
})

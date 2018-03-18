const {resolve: resolvePath} = require('path')
const {readFileSync} = require('fs-extra')

const {test} = require('tap')

const endpointHtmlToJson = require('../../../lib/endpoint/html-to-json')

const fixtures = {
  in: readFileSync(resolvePath(__dirname, 'in.html'), 'utf8'),
  out: require('./out.json')
}

test('https://developer.github.com/v3/pulls/#list-pull-requests to JSON', async t => {
  const actual = await endpointHtmlToJson(fixtures.in)
  t.deepEquals(actual, fixtures.out)
  t.end()
})

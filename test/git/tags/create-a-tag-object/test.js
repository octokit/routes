const {resolve: resolvePath} = require('path')
const {readFileSync} = require('fs')

const {test} = require('tap')

const endpointHtmlToJson = require('../../../../lib/endpoint/html-to-json')

const fixtures = {
  in: readFileSync(resolvePath(__dirname, 'in.html'), 'utf8'),
  out: require('./out.json')
}

test('https://developer.github.com/v3/git/tags/#create-a-tag-object to JSON', t => {
  const actual = endpointHtmlToJson(fixtures.in)
  t.deepEquals(actual, fixtures.out)
  t.end()
})

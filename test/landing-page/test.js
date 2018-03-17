const {resolve: resolvePath} = require('path')
const {readFileSync} = require('fs-extra')

const {test} = require('tap')

const toPagesJson = require('../../lib/landing-page/to-pages-json')

const fixtures = {
  in: readFileSync(resolvePath(__dirname, 'in.html'), 'utf8'),
  out: require('./out.json')
}

test('landing page HTML to routes.json', async t => {
  const actual = toPagesJson(fixtures.in)
  t.deepEquals(actual, fixtures.out)
  t.end()
})

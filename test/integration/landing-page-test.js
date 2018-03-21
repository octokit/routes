const {test} = require('tap')

const cache = require('../../lib/cache')
const getDocPages = require('../../lib/landing-page/to-pages-json')

// if you found a problem with how cache/v3/index.html is parsed into
// cache/pages.json, then
// 1. edit cache/pages.json directly to the expected outcome,
// 2. run `node_modules/.bin/tap test/integration/landing-page-test.js`,
//    the test should fail
// 3. Start a pull request with the failing test, prefix title with "WIP"
// 3. implement the fix until the test pasess
// 4. run `npm run update`
// 5. push all changes to your pull request. Review your changes, once you are
//    happy remove the "WIP" from the pull request and ask for a review
test(`v3/index.html -> pages.json`, async t => {
  const expectedPages = require('../../cache/pages.json')
  const html = await cache.read('v3/index.html')
  const actualPages = getDocPages(html)

  t.deepEquals(actualPages, expectedPages)
  t.end()
})

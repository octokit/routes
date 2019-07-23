const { test } = require('tap')

const {
  getBaseUrl,
  getPathPrefix,
  getCacheDir,
  getRoutesDir
} = require('../util')
const Cache = require('../../lib/cache')
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
  const [cacheRoot, cacheDir] = ['../../cache', getCacheDir()]
  const expectedPages = require(`${cacheRoot}/${cacheDir}/pages.json`)
  const cache = new Cache(cacheDir)
  const pathPrefix = getPathPrefix()
  const html = await cache.read(`${pathPrefix}/index.html`)
  const actualPages = getDocPages({
    baseUrl: getBaseUrl(),
    folderName: getRoutesDir(),
    cache
  }, html)

  t.deepEquals(actualPages, expectedPages)
  t.end()
})

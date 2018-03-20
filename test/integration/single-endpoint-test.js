const {test} = require('tap')

const {
  getAllDocumentationUrls,
  getRoutesForUrl
} = require('../util')
const getEndpoint = require('../../lib/endpoint/get')

const URLS = getAllDocumentationUrls()

URLS.forEach(url => {
  test(`${url} to JSON separate route files in routes/**/*.json`, async t => {
    const expected = getRoutesForUrl(url)

    const actual = await getEndpoint({
      cached: true
    }, url)

    t.deepEquals(actual, expected)
    t.end()
  })
})

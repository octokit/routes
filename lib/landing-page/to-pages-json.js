module.exports = landingPageHtmlToRoutesJson

require('dotenv').config()

const cheerio = require('cheerio')

const BASE_URL = process.env.BASE_URL || 'https://developer.github.com/v3/'
const PATH_PREFIX = process.env.PATH_PREFIX || '/v3/'

function landingPageHtmlToRoutesJson (html) {
  const $ = cheerio.load(html)

  // skip the first list belonging to "Overiew" withe the only exception of
  // "OAuth Authorizations API", see https://github.com/octokit/routes/issues/45
  // const oAuthApiSelector = '.sidebar-menu a[href="/v3/oauth_authorizations/"]'
  // const allPagesAfterOverviewSelector = '.sidebar-menu li.js-topic ~ li.js-topic a'
  // return $([oAuthApiSelector, allPagesAfterOverviewSelector].join(', '))
  return $('.sidebar-menu li.js-topic a')
    .map((i, el) => {
      const path = $(el).attr('href').replace(PATH_PREFIX, '')
      const [scope, subScope] = path.split('/')
      const result = {
        url: BASE_URL + path,
        scope
      }

      if (subScope) {
        result.subScope = subScope
      }

      return result
    })
    .get()
    .filter(page => {
      // Reactions sub navigation
      if (page.url.includes('#')) {
        return
      }

      // ignore landing page itself
      if (page.url === BASE_URL) {
        return
      }

      return true
    })
}

module.exports = landingPageHtmlToRoutesJson

const cheerio = require('cheerio')

function landingPageHtmlToRoutesJson (state, html) {
  const $ = cheerio.load(html)

  return $('.sidebar-menu li.js-topic a')
    .map((i, el) => {
      const path = $(el).attr('href').replace(/.*\/v3\//, '')
      const [scope, subScope] = path.split('/')

      const result = {
        url: state.baseUrl + path,
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
      if (page.url === state.baseUrl) {
        return
      }

      return true
    })
    .sort((a, b) => a.url.localeCompare(b.url, 'en', { sensitivity: 'base' }))
}

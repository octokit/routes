module.exports = landingPageHtmlToRoutesJson

const cheerio = require('cheerio')

const BASE_URL = 'https://developer.github.com/v3/'

function landingPageHtmlToRoutesJson (html) {
  const $ = cheerio.load(html)
  return $('.sidebar-menu li.js-topic ~ li.js-topic a')
    .map((i, el) => {
      const path = $(el).attr('href').replace('/v3/', '')
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
    .filter(page => page.url.includes('/v3/') && !page.url.includes('#'))
}

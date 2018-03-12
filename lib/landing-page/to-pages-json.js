module.exports = landingPageHtmlToRoutesJson

const cheerio = require('cheerio')

const BASE_URL = 'https://developer.github.com/v3/'

function landingPageHtmlToRoutesJson (html) {
  const $ = cheerio.load(html)
  return $('.sidebar-menu li.js-topic ~ li.js-topic a')
    .map((i, el) => {
      const result = {
        url: $(el).attr('href'),
        scope: $(el).closest('.js-topic').find('h3').text().trim()
      }

      const subScope = $(el).text().trim()
      if (result.scope !== subScope) {
        result.subScope = subScope
      }

      return result
    })
    .get()
    .filter(page => page.url.startsWith('/v3/') && !page.url.includes('#'))
    .map(page => ({
      ...page,
      url: BASE_URL + page.url.replace('/v3/', '')
    }))
    .filter(page => page.url.trim().length)
    .sort((a, b) => a.scope > b.scope ? 1 : -1)
}

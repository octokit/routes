const cheerio = require('cheerio')

module.exports = {
  is (el) {
    return cheerio(el).is('h1, h2')
  },
  parse (el) {
    const $el = cheerio(el)
    let text = $el.text().trim().replace(/\s+/g, ' ')
    const enabledForApps = $el.find('a[title="Enabled for GitHub Apps"]').length === 1

    return {
      type: 'title',
      text,
      enabledForApps
    }
  }
}

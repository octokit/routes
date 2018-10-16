const cheerio = require('cheerio')

module.exports = {
  is (el) {
    return cheerio(el).is('h1, h2')
  },
  parse (el) {
    const $el = cheerio(el)
    let text = $el.text().trim().replace(/\s+/g, ' ')
    const enabledForApps = $el.find('a[title="Enabled for GitHub Apps"]').length === 1

    // There are few exceptions when a whole page describes a single endpoint.
    // The titles on these pages don’t map well to method names, hence the overide
    // See https://github.com/octokit/routes/issues/50
    if ($el.is('h1')) {
      text = 'Get'
    }

    return {
      type: 'title',
      text,
      enabledForApps
    }
  }
}

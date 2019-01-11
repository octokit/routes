const cheerio = require('cheerio')

const turndown = require('../../turndown')

module.exports = {
  is (el) {
    return cheerio(el).is('.alert.product')
  },
  parse (el) {
    const $el = cheerio(el)

    return {
      type: 'description',
      text: turndown($el.html()),
      isWarning: true
    }
  }
}

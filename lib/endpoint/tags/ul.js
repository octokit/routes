const cheerio = require('cheerio')

const turndown = require('../../turndown')

module.exports = {
  is (el) {
    return cheerio(el).is('ul')
  },
  parse (el) {
    return {
      type: `description`,
      text: turndown(cheerio.html(el))
    }
  }
}

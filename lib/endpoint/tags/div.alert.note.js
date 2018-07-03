const cheerio = require('cheerio')

const turndown = require('../../turndown')

const REGEX_PREVIEW_ACCEPT_HEADER = /\bapplication\/vnd\.github\.([^\s]+)-preview[^\s]*/
const REGEX_PREVIEW_LABEL = /(\. | \n\s*)(.*)in the `Accept` header:[^]*/

module.exports = {
  is (el) {
    return cheerio(el).is('.alert.note')
  },
  parse (el) {
    const $el = cheerio(el)
    const text = turndown($el.html()).trim()

    const matches = text.match(REGEX_PREVIEW_ACCEPT_HEADER)
    if (matches) {
      return {
        type: 'previewTitle',
        acceptHeader: matches[0],
        preview: matches[1],
        text: text.replace(REGEX_PREVIEW_LABEL, '$1').trim()
      }
    }

    return {
      type: 'description',
      text: turndown($el.html()).trim(),
      isNote: true
    }
  }
}

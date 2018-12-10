const cheerio = require('cheerio')

const turndown = require('../../turndown')

const REGEX_PREVIEW_ACCEPT_HEADER = /\bapplication\/vnd\.github\.([^\s]+)-preview[^\s]*/

module.exports = {
  is (el) {
    return cheerio(el).is('.alert.note') || cheerio(el).is('.alert.tip')
  },
  parse (el) {
    const $el = cheerio(el)
    const text = turndown($el.html()).trim()

    const matches = text.match(REGEX_PREVIEW_ACCEPT_HEADER)
    const isAdditional = /^(\*\*Note:\*\* )?An additional/i.test(text)
    const isRequiredForAccess = /to access (the([^,.]*)|this) (API|endpoint)/i.test(text)

    if (matches) {
      // workarounds, can be removed once the wording in the docs is clarified
      const isAntManException = matches[1] === 'ant-man' && /^This endpoint is part of the deployment and deployment status enhancement/.test(text)
      const isHellcatException = matches[1] === 'hellcat' && /At this time, the hellcat-preview media type is required to use this endpoint/.test($el.parent().text())
      const isNotRequired = !isAntManException && !isHellcatException && /^(luke-cage|hellcat|ant-man)$/.test(matches[1])

      return {
        type: 'preview',
        acceptHeader: matches[0],
        preview: matches[1],
        required: isRequiredForAccess && !isAdditional && !isNotRequired,
        text
      }
    }

    return {
      type: 'description',
      text: turndown($el.html()).trim(),
      isNote: cheerio(el).is('.alert.note'),
      isTip: cheerio(el).is('.alert.tip')
    }
  }
}

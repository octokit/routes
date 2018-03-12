module.exports = htmlContainsEndpoint

const cheerio = require('cheerio')

const {METHODS} = require('http')

function htmlContainsEndpoint (html) {
  const $ = cheerio.load(html)
  const $preTags = $('pre')
    .filter((i, el) => {
      const [method] = cheerio(el).text().trim().split(' ')
      return METHODS.includes(method)
    })

  return $preTags.length > 0
}

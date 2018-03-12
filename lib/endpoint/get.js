module.exports = getEndpoint

const parseUrl = require('url').parse

const cheerio = require('cheerio')
const turndownService = require('turndown')()
const turndown = turndownService.turndown.bind(turndownService)

const cache = require('../cache')
const getHtml = require('../get-html')
const htmlContainsEndpoint = require('./html-contains-endpoint')

const {METHODS} = require('http')
const REQUIRED_REGEXP = /^\*\*Required\*\*\. /
const CAN_BE_ONE_OF_REGEXP = /^Can be one of (`[a-z]+`)(, `[a-z]+`)*/
const EITHER_REGEXP = /^Either (`[a-z]+`)/

async function getEndpoint (url) {
  const [pageUrl, id] = url.split('#')
  const {path: pagePath} = parseUrl(url)
  const pageEndpointPath = `${pagePath}${id}.html`
  let endpointHtml

  if (cache.exists(pageEndpointPath)) {
    endpointHtml = cache.read(pageEndpointPath)
  } else {
    const pageHtml = await getHtml(pageUrl)
    const $ = cheerio.load(pageHtml)
    const $title = $(`#${id}`).closest('h2')

    endpointHtml = $.html($title) + '\n' + $title
      .nextUntil('h2')
      .map((i, el) => $.html(el))
      .get()
      .join('\n')

    cache.writeHtml(pageEndpointPath, endpointHtml)
  }

  if (!htmlContainsEndpoint(endpointHtml)) {
    return null
  }

  const $ = cheerio.load(endpointHtml)
  const $title = $('h2')

  const name = $title.text().trim().replace(/\s+/g, ' ')
  const description = turndown(
    $title
      .nextUntil('pre')
      .map((i, el) => cheerio.html(el))
      .get()
      .join('')
  )

  const params = $('table')
    .filter((i, el) => cheerio(el).find('thead').text().replace(/\s/g, '') === 'NameTypeDescription')
    .find('tbody tr')
    .map((i, el) => {
      const [name, type, descriptionAndDefault] = cheerio(el)
        .children()
        .map((i, el) => {
          if (i < 2) { // name, type
            return cheerio(el).text().trim()
          }

          const text = cheerio(el).text().trim()
          const defaultValue = (text.match(/ Default: (.*)$/) || []).pop()

          let description = turndown(cheerio(el).html().trim().replace(/ Default: .*$/, ''))
          const isRequired = REQUIRED_REGEXP.test(description)

          if (isRequired) {
            description = description.replace(REQUIRED_REGEXP, '')
          }

          let enumValues
          if (CAN_BE_ONE_OF_REGEXP.test(description)) {
            // enumValues = description.replace('Can be one of ', '').replace(/ or /g, '').split(/[, \.]/).filter((term) => term[0] === '`').map((term) => term.substring(1, term.length - 1))
            enumValues = description.replace(/[,.]/g, '').split(' ').filter((term) => term[0] === '`' && term[term.length - 1] === '`').map((term) => term.substring(1, term.length - 1))
          } else if (EITHER_REGEXP.test(description)) {
            // Include only words that begin and end with backticks (ignore all others)
            enumValues = description.replace(/[,.]/g, '').split(' ').filter((term) => term[0] === '`' && term[term.length - 1] === '`').map((term) => term.substring(1, term.length - 1))
          }

          return {
            description: description,
            defaultValue,
            enumValues,
            isRequired
          }
        })
        .get()

      return {
        name,
        type: type === 'string' ? descriptionAndDefault.enumValues || type : type,
        description: descriptionAndDefault.description,
        default: descriptionAndDefault.defaultValue,
        required: descriptionAndDefault.isRequired
      }
    })
    .get()

  const routes = $('pre')
    .map((i, el) => {
      const [method, ...urlParts] = cheerio(el).text().trim('').split(/\s+/)
      if (!METHODS.includes(method)) {
        return
      }

      return {method, path: urlParts.join(' ')}
    })
    .get()
    .filter(Boolean)

  if (routes.length > 1) {
    return routes.map(({method, path}) => ({
      name,
      method,
      path
    }))
  }

  const {method, path} = routes[0]

  return {
    name,
    method,
    path,
    description,
    params,
    documentationUrl: url
  }
}

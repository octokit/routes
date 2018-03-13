module.exports = getEndpoint

const parseUrl = require('url').parse

const cheerio = require('cheerio')

const cache = require('../cache')
const getHtml = require('../get-html')
const htmlToJson = require('./html-to-json')

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

  const endpoints = htmlToJson(endpointHtml)

  if (!endpoints) {
    return
  }

  return endpoints.map(endopint => Object.assign(endopint, {
    documentationUrl: url
  }))
}

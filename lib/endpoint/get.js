module.exports = getEndpoint

const existsSync = require('fs').existsSync
const {join: joinPath, relative: relativePath} = require('path')
const parseUrl = require('url').parse

const cheerio = require('cheerio')

const cache = require('../cache')
const getHtml = require('../get-html')
const htmlToJson = require('./html-to-json')

async function getEndpoint (url) {
  const [pageUrl, id] = url.split('#')
  const {path: pagePath} = parseUrl(url)
  const pageOverridePath = joinPath(__dirname, 'overrides', `${pagePath}${id}.json`)
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

    // add override to cached HTML page so we can review changes and update
    // the override if necessary
    if (existsSync(pageOverridePath)) {
      endpointHtml = `<!--
  custom override at ${relativePath(process.cwd(), pageOverridePath)}
  Make sure to review it on updates to this endpoint’s documentation
-->

${endpointHtml}`
    }
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

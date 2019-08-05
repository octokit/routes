module.exports = getEndpoint

const { join: joinPath } = require('path')
const { URL } = require('url')

const cheerio = require('cheerio')

const applyDeprecations = require('./overrides/deprecations')
const getHtml = require('../get-html')
const htmlToJson = require('./html-to-json')
const normalizeUrl = require('../normalize-url')
const toIdName = require('./to-id-name')

async function getEndpoint (state, url) {
  const [pageUrl, id] = url.split('#')
  const { pathname: pagePath } = new URL(url)

  const pageOverridePath = joinPath(__dirname, 'overrides', `${pagePath.replace(`/enterprise/${state.gheVersion}/`, '/')}${id}.json`)
  const pageEndpointPath = `${pagePath}${id}.html`
  let endpointHtml

  try {
    const endpoints = require(pageOverridePath)
    if (endpoints) {
      endpoints.forEach(endpoint => {
        endpoint.documentationUrl = url
        endpoint.isOverride = true
      })
    }
    return endpoints
  } catch (error) {
    /* no override, no problem */
  }

  if (state.cached && await state.cache.exists(pageEndpointPath)) {
    endpointHtml = await state.cache.read(pageEndpointPath)
  } else {
    const pageHtml = await getHtml(state, pageUrl)
    const $ = cheerio.load(pageHtml)
    const $title = $(`#${id}`).closest('h1, h2')

    endpointHtml = $.html($title) + '\n' + $title
      .nextUntil('h1, h2')
      .map((i, el) => $.html(el))
      .get()
      .join('\n')

    await state.cache.writeHtml(pageEndpointPath, endpointHtml)
  }

  const endpointParams = {
    baseUrl: state.baseUrl,
    gheVersion: state.gheVersion,
    documentationUrl: url
  }
  const endpoints = await htmlToJson(endpointHtml, endpointParams)
  if (!endpoints) {
    return
  }

  const result = endpoints.map(endpoint => {
    const documentationUrl = normalizeUrl(url)
    const scope = documentationUrl.match(/\/v3\/([^/#]+)/).pop()
    return Object.assign(endpoint, {
      idName: toIdName({
        method: endpoint.method,
        path: endpoint.path,
        scope,
        name: endpoint.operation.summary
      }),
      documentationUrl
    })
  })

  applyDeprecations(state, result)

  return result
}

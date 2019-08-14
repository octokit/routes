module.exports = getEndpoint

const { join: joinPath } = require('path')
const { URL } = require('url')

const cheerio = require('cheerio')

const getHtml = require('../get-html')
const htmlToJson = require('./html-to-json')

async function getEndpoint (state, url) {
  const [pageUrl, id] = url.split('#')
  const { pathname: pagePath } = new URL(url)

  const pageOverridePath = joinPath(__dirname, 'overrides', `${pagePath.replace(`/enterprise/${state.gheVersion}/`, '/')}${id}.json`)
  const pageEndpointPath = `${pagePath}${id}.html`
  let endpointHtml

  try {
    const routes = require(pageOverridePath)
    if (routes) {
      routes.forEach(route => {
        route.operation.externalDocs.url = url
        route.operation['x-github'].overridden = true
      })
    }
    return routes
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

  const routes = await htmlToJson(endpointHtml, {
    baseUrl: state.baseUrl,
    gheVersion: state.gheVersion,
    documentationUrl: url
  })
  return routes
}

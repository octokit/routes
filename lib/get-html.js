module.exports = getHtml

const parseUrl = require('url').parse
const fetch = require('node-fetch')
const cache = require('./cache')

async function getHtml (state, url) {
  const cacheFilePath = parseUrl(url).path + '/index.html'
  const memoryCached = state.cache[url]

  if (memoryCached) {
    return memoryCached
  }

  if (state.cached && await cache.exists(cacheFilePath)) {
    state.cache[url] = cache.read(cacheFilePath)
    return state.cache[url]
  }

  console.log(`⌛  fetching ${url}`)

  // throttle requests to GitHub
  await new Promise(resolve => setTimeout(resolve, 1000))

  const html = await (await fetch(url)).text()
  await cache.writeHtml(cacheFilePath, html)
  state.cache[url] = html
  return html
}

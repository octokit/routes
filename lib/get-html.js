module.exports = getHtml

const parseUrl = require('url').parse
const fetch = require('node-fetch')
const cache = require('./cache')

async function getHtml (url) {
  const cacheFilePath = parseUrl(url).path + '/index.html'

  if (cache.exists(cacheFilePath)) {
    return cache.read(cacheFilePath)
  }

  // throttle requests to GitHub
  await new Promise(resolve => setTimeout(resolve, 1000))

  const html = await (await fetch(url)).text()
  cache.writeHtml(cacheFilePath, html)
  return html
}

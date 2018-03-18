module.exports = getDocPages

const cache = require('../cache')
const getHtml = require('../get-html')
const toPagesJson = require('./to-pages-json')

async function getDocPages (state) {
  if (state.cached && await cache.exists('pages.json')) {
    return cache.readJson('pages.json')
  }

  const html = await getHtml(state, state.baseUrl)
  const pages = toPagesJson(html)

  await cache.writeJson('pages.json', pages)

  return pages
}

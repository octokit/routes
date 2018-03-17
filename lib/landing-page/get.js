module.exports = getDocPages

const cache = require('../cache')
const getHtml = require('../get-html')
const toPagesJson = require('./to-pages-json')

const BASE_URL = 'https://developer.github.com/v3/'

async function getDocPages () {
  if (await cache.exists('pages.json')) {
    return cache.readJson('pages.json')
  }

  const html = await getHtml(BASE_URL)
  const pages = toPagesJson(html)

  await cache.writeJson('pages.json', pages)

  return pages
}

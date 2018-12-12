module.exports = getDocPages

const getHtml = require('../get-html')
const toPagesJson = require('./to-pages-json')

async function getDocPages (state) {
  if (state.cached && await state.cache.exists('pages.json')) {
    return state.cache.readJson('pages.json')
  }

  const html = await getHtml(state, state.baseUrl)
  const pages = toPagesJson(state, html)

  await state.cache.writeJson('pages.json', pages)

  return pages
}

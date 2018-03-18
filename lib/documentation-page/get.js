module.exports = getEndpoints

const getHtml = require('../get-html')
const toSections = require('./html-to-sections')

async function getEndpoints (state, url) {
  const html = await getHtml(state, url)
  return toSections(state, url, html)
}

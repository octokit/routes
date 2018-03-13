module.exports = getEndpoints

const getHtml = require('../get-html')
const toSections = require('./html-to-sections')

async function getEndpoints (page) {
  const html = await getHtml(page.url)
  return toSections(page, html)
}

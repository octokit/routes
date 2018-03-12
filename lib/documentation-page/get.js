module.exports = getEndpoints

const {flatten} = require('lodash')

const getHtml = require('../get-html')
const getSections = require('./get-sections')
const getEndpoint = require('../endpoint/get')

async function getEndpoints (page) {
  const html = await getHtml(page.url)
  const sections = getSections(page, html)

  const endpoints = await Promise.all(sections.map(section => getEndpoint(section.url)))
  return flatten(endpoints.filter(Boolean))
}

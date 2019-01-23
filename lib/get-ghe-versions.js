module.exports = getGheVersions

const cheerio = require('cheerio')

const getHtml = require('./get-html')

async function getGheVersions (state) {
  const html = await getHtml(state, 'https://developer.github.com/v3/')
  const $ = cheerio.load(html)
  return $('#header .dropdown-menu-item[data-proofer-ignore] ~ *')
    .map((i, el) => {
      return $(el).text().match(/[\d.]+$/)[0]
    })
    .get()
}

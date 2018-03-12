module.exports = getSections

const parseUrl = require('url').parse

const cheerio = require('cheerio')

const cache = require('../cache')

function getSections (page, html) {
  const {path: pagePath} = parseUrl(page.url)
  const cachePageSectionsPath = `${pagePath}/sections.json`

  if (cache.exists(cachePageSectionsPath)) {
    return cache.readJson(cachePageSectionsPath)
  }

  const $ = cheerio.load(html)
  const sections = [].concat.apply([], $('.main h2')
    .map((i, el) => {
      const id = $(el).find('a[id]').attr('id')
      const name = $(el).text().trim().replace(/\s+/g, ' ')
      const url = `${page.url}#${id}`

      return {id, name, url}
    })
    .get()
  )

  cache.writeJson(cachePageSectionsPath, sections)

  return sections
}

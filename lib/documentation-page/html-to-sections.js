module.exports = getSections

const parseUrl = require('url').parse

const cheerio = require('cheerio')

const cache = require('../cache')

async function getSections (state, pageUrl, html) {
  const {path: pagePath} = parseUrl(pageUrl)
  const cachePageSectionsPath = `${pagePath}/sections.json`

  if (state.cached && await cache.exists(cachePageSectionsPath)) {
    return cache.readJson(cachePageSectionsPath)
  }

  const $ = cheerio.load(html)
  const sections = [].concat.apply([], $('.main h2')
    .map((i, el) => {
      const id = $(el).find('a[id]').attr('id')

      if (!id) {
        return
      }

      const name = $(el).text().trim().replace(/\s+/g, ' ')
      const url = `${pageUrl}#${id}`
      return {id, name, url}
    })
    .get()
    .filter(Boolean)
  )

  await cache.writeJson(cachePageSectionsPath, sections)

  return sections
}

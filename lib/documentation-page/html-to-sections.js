module.exports = getSections

const parseUrl = require('url').parse

const cheerio = require('cheerio')

async function getSections (state, pageUrl, html) {
  const { path: pagePath } = parseUrl(pageUrl)
  const cachePageSectionsPath = `${pagePath}/sections.json`

  if (state.cached && await state.cache.exists(cachePageSectionsPath)) {
    return state.cache.readJson(cachePageSectionsPath)
  }

  const $ = cheerio.load(html)

  // .main h1 used on pages that have a single endpoint
  // see https://github.com/octokit/routes/issues/50
  const selector = $('.main h2').length ? '.main h2' : '.main h1'

  const sections = [].concat.apply([], $(selector)
    .map((i, el) => {
      const id = $(el).find('a[id]').attr('id')

      if (!id) {
        return
      }

      const name = $(el).text().trim().replace(/\s+/g, ' ')
      const url = `${pageUrl}#${id}`
      return { id, name, url }
    })
    .get()
    .filter(Boolean)
  )

  await state.cache.writeJson(cachePageSectionsPath, sections)

  return sections
}

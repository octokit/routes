const {join: joinPath, dirname} = require('path')
const {METHODS} = require('http')
const parseUrl = require('url').parse
const {existsSync, lstatSync, readFileSync, writeFileSync} = require('fs')

const _ = require('lodash')
const cheerio = require('cheerio')
const fetch = require('node-fetch')
const mkdirp = require('mkdirp')
const turndownService = require('turndown')()
const turndown = turndownService.turndown.bind(turndownService)
const normalizeHtml = require('js-beautify').html

const BASE_URL = 'https://developer.github.com/v3/'

mkdirp.sync('cache')
mkdirp.sync('routes')

const multiTables = []
const multiEndpoints = []

main()
  .then(() => {
    console.log('\n\nMULTIPLE TABLES')
    console.log('- ' + multiTables.join('\n- '))
    console.log('\n\nMULTIPLE ENDPOINTS')
    console.log(multiEndpoints.join('\n\n'))
  })

process.on('unhandledRejection', (error) => {
  console.log(`\nerror.stack ==============================`)
  console.log(error.stack)
})

async function main () {
  const pages = await getDocPages()
  const count = pages.length

  console.log(`🤖  ${count} pages found`)
  // await pages.filter(page => {
  //   return page.url === 'https://developer.github.com/v3/apps/marketplace/'
  // }).reduce(async (promise, page, i) => {
  await pages.reduce(async (promise, page, i) => {
    await promise

    console.log('')
    console.log(`🔭  ${i + 1}/${count}: ${page.url}`)
    const endpoints = await getEndpoints(page)

    if (endpoints.length === 0) {
      console.log(`ℹ️  No endpoints found`)
      return
    }

    const fileName = _.kebabCase(
      [page.scope, page.subScope]
        .filter(Boolean)
        .join('-')
    )
      .replace(/\bgit-hub\b/, 'github') + '.json'
    const filePath = joinPath('routes', fileName)

    writeFileSync(filePath, JSON.stringify(endpoints, null, 2))
    console.log(`✅  ${fileName} written`)
  }, Promise.resolve())
  // for (var i = 0; i < pages.length; i++) {
  // ...
  // }
}

async function get (url) {
  const {path} = parseUrl(url)
  const cacheFilePath = joinPath('cache', path, 'index.html')

  if (existsSync(cacheFilePath) && lstatSync(cacheFilePath).isFile()) {
    return readFileSync(cacheFilePath, 'utf8')
  }

  const html = await (await fetch(url, {
    accept: 'text/html'
  })).text()

  mkdirp.sync(dirname(cacheFilePath))
  writeFileSync(cacheFilePath, normalizeHtml(html))

  return html
}

async function getDocPages () {
  if (existsSync('cache/pages.json') && lstatSync('cache/pages.json').isFile()) {
    return JSON.parse(readFileSync('cache/pages.json', 'utf8'))
  }

  await new Promise(resolve => setTimeout(resolve, 1000))
  const $ = cheerio.load(await get(BASE_URL))
  const pages = $('.sidebar-menu li.js-topic ~ li.js-topic a')
    .map((i, el) => {
      const result = {
        url: $(el).attr('href'),
        scope: $(el).closest('.js-topic').find('h3').text().trim()
      }

      const subScope = $(el).text().trim()
      if (result.scope !== subScope) {
        result.subScope = subScope
      }

      return result
    })
    .get()
    .filter(page => page.url.startsWith('/v3/') && !page.url.includes('#'))
    .map(page => ({
      ...page,
      url: BASE_URL + page.url.replace('/v3/', '')
    }))
    .filter(page => page.url.trim().length)
    .sort((a, b) => a.scope > b.scope ? 1 : -1)

  writeFileSync('cache/pages.json', JSON.stringify(pages, null, 2) + '\n')

  return pages
}

async function getEndpoints (page) {
  await new Promise(resolve => setTimeout(resolve, 1000))
  const html = await get(page.url)
  const $ = cheerio.load(html)

  const endpoints = [].concat.apply([], $('.main h2')
    .map((i, el) => {
      if (!isEndpointSegment($(el))) {
        return
      }

      const id = $(el).find('a[id]').attr('id')
      const documentationUrl = `${page.url}#${id}`
      const name = $(el).text().trim()

      console.log(`🔍  Looking at "${name}" (${documentationUrl})`)

      const segmentHtml = $.html(el) + '\n' + $(el)
        .nextUntil('h2')
        .map((i, el) => $.html(el))
        .get()
        .join('\n')

      const {path: pagePath} = parseUrl(page.url)
      const cacheSegmentFilePath = joinPath('cache', pagePath, id + '.html')
      mkdirp.sync(dirname(cacheSegmentFilePath))
      writeFileSync(cacheSegmentFilePath, normalizeHtml(segmentHtml))

      const description = turndown(
        $(el)
          .nextUntil('pre')
          .map((i, el) => $.html(el))
          .get()
          .join('')
      )

      const $paramTables = $(el)
        .nextUntil('h2')
        .filter('table')
        .filter((i, el) => $(el).find('thead').text().replace(/\s/g, '') === 'NameTypeDescription')

      if ($paramTables.length > 1) {
        multiTables.push(`More than one parameters/input tables found at ${documentationUrl}`)
      }

      const params = $paramTables
        .find('tbody tr')
        .map((i, el) => {
          const [name, type, descriptionAndDefault] = $(el)
            .children()
            .map((i, el) => {
              if (i < 2) { // name, type
                return $(el).text().trim()
              }

              const text = $(el).text().trim()
              const defaultValue = (text.match(/ Default: (.*)$/) || []).pop()

              return {
                description: turndown($(el).html().trim().replace(/ Default: .*$/, '')),
                defaultValue
              }
            })
            .get()

          return {
            name,
            type,
            description: descriptionAndDefault.description,
            default: descriptionAndDefault.defaultValue
          }
        })
        .get()

      const routes = $(el)
        .nextUntil('h2')
        .filter('pre')
        .map((i, el) => {
          const [method, path] = $(el).text().trim('').split(' ')
          if (!METHODS.includes(method)) {
            return
          }

          return {method, path}
        })
        .get()
        .filter(Boolean)

      if (routes.length > 1) {
        multiEndpoints.push(`More than one endpoint code block found at ${documentationUrl}:
${routes.map(({method, path}) => `${method} ${path}`).join('\n')}`)
        return routes.map(({method, path}) => ({
          name,
          method,
          path
        }))
      }

      const {method, path} = routes[0]

      return [{
        name,
        method,
        path,
        description,
        params,
        documentationUrl
      }]
    })
    .get()
  )

  return endpoints
}

function isEndpointSegment ($el) {
  const $preTags = $el
    .nextUntil('h2')
    .filter('pre')
    .filter((i, el) => {
      const [method] = cheerio(el).text().trim().split(' ')
      return METHODS.includes(method)
    })

  if ($preTags.length === 0) {
    return false
  }

  return true
}

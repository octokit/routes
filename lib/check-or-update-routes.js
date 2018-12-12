module.exports = checkOrUpdateRoutes

const { join: joinPath } = require('path')
const { ensureFile, writeFile } = require('fs-extra')

const { kebabCase, camelCase } = require('lodash')
const { diff, diffString } = require('json-diff')

const Cache = require('./cache')
const getEndpoint = require('./endpoint/get')
const parseUrlsOption = require('./options/urls')
const toRoutesFilePath = require('./url-to-routes-file-path')

async function checkOrUpdateRoutes (options) {
  if (!options.urls && !options.cached) {
    console.log(`🔍  Looking for URLs (this might take a while)`)
  }

  const [baseUrl, folderName] = options.ghe
    ? [`https://developer.github.com/enterprise/${options.ghe}/v3/`, `ghe-${options.ghe}`]
    : ['https://developer.github.com/v3/', 'api.github.com']

  const state = {
    baseUrl,
    folderName,
    cache: new Cache(folderName),
    memoryCache: {},
    checkOnly: options.checkOnly,
    cached: options.cached
  }

  const urls = await parseUrlsOption(state, options.urls)
  console.log(`🤖  Looking for sections at ${urls.length} URLs`)

  const allEndpoints = []
  const outOfDate = []
  await urls.reduce(async (promise, url) => {
    await promise

    console.log(`🌐  ${url}`)
    const endpoints = await getEndpoint(state, url)

    if (!endpoints) {
      console.log('ℹ️  No endpoints')
      return
    }

    allEndpoints.push(...endpoints)

    await endpoints.reduce(async (promise, endpoint) => {
      await promise
      const filePath = toRoutesFilePath(state, endpoint)
      const relativeFilePath = filePath.replace(joinPath(__dirname, '..'), '')
      const route = [endpoint.method, endpoint.path].join(' ')

      let existingEndpoint
      try {
        existingEndpoint = require(filePath)
      } catch (error) {
        console.log(`🆕  ${route} at ${relativeFilePath}`)
      }

      const endpointDiffs = diff(existingEndpoint, endpoint)
      if (!endpointDiffs) {
        console.log(`✅  ${route} is up-to-date`)
        return
      }

      console.log(`❌  ${route} is not up-to-date`)
      outOfDate.push({
        new: endpoint,
        old: existingEndpoint,
        diff: existingEndpoint && diffString(existingEndpoint, endpoint),
        path: relativeFilePath,
        route,
        url: endpoint.documentationUrl
      })

      if (options.checkOnly) {
        return
      }

      await ensureFile(filePath)
      await writeFile(filePath, JSON.stringify(endpoint, null, 2) + '\n')
      console.log(`✅  ${relativeFilePath} written`)
    }, null)
  }, null)

  console.log('')
  console.log('🏁  done')
  if (outOfDate.length === 0) {
    console.log(`✅  all up-to-date`)
    return
  }

  console.log(`❌  ${outOfDate.length} changes found`)

  outOfDate.forEach(change => {
    console.log('')
    console.log(`${change.route} (${change.url}):`)
    if (!change.old) {
      console.log(`${change.path} does not exist`)
      return
    }

    console.log(change.diff)
  })

  if (options.checkOnly) {
    console.log('')
    console.log(`💁  Update routes with the "update" command`)
    return
  }

  console.log(`ℹ️  Updating routes index files`)
  const routesByScope = allEndpoints.reduce((map, endpoint) => {
    const [scope] = endpoint.documentationUrl.substr(state.baseUrl.length).split('/')
    const scopeNormalized = camelCase(scope)
    if (!map[scopeNormalized]) {
      map[scopeNormalized] = []
    }

    map[scopeNormalized].push(endpoint)

    return map
  }, {})

  await Object.keys(routesByScope).reduce(async (promise, scope) => {
    await promise
    const filename = kebabCase(scope) + '.json'
    const path = joinPath(__dirname, '..', 'routes', state.folderName, filename)
    await writeFile(path, JSON.stringify(routesByScope[scope], null, 2) + '\n')
    console.log(`✅  routes/${state.folderName}/${filename} written`)
  }, null)

  await writeFile(`routes/${state.folderName}/index.json`, JSON.stringify(routesByScope, null, 2) + '\n')
  console.log(`✅  routes/${state.folderName}/index.json written`)
}

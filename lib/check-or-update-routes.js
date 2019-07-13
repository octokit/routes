module.exports = checkOrUpdateRoutes

const { resolve: pathResolve, join: joinPaths } = require('path')

const _ = require('lodash')
const { writeJson, ensureFile } = require('fs-extra')

const Cache = require('./cache')
const getEndpoint = require('./endpoint/get')
const getGheVersions = require('./get-ghe-versions')
const parseUrlsOption = require('./options/urls')
const { convertEndpointToOperation } = require('./convert-endpoint-to-operation')

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
    cached: options.cached,
    gheVersion: parseFloat(options.ghe)
  }

  if (options.ghe === '') {
    console.log('ℹ️  Loading GitHub Enterprise versions')
    const gheVersions = await getGheVersions(state)

    for (let index = 0; index < gheVersions.length; index++) {
      const ghe = gheVersions[index]
      console.log(`ℹ️  Updating routes for GitHub Enterprise ${ghe}`)
      await checkOrUpdateRoutes({
        ...options,
        ghe
      })
    }

    return
  }

  const urls = await parseUrlsOption(state, options.urls)
  console.log(`🤖  Looking for sections at ${urls.length} URLs`)

  const allEndpoints = []
  await urls.reduce(async (promise, url) => {
    await promise

    console.log(`🌐  ${url}`)
    const endpoints = await getEndpoint(state, url)

    if (!endpoints) {
      console.log('ℹ️  No endpoints')
      return
    }

    allEndpoints.push(...endpoints)
  }, null)

  console.log('')
  console.log('🏁  done')

  const mainSchemaFileRelativePath = joinPaths(
    '../openapi',
    state.gheVersion ? `ghe-${state.gheVersion}` : 'api.github.com'
  )
  const mainSchema = require(mainSchemaFileRelativePath)
  const mainSchemaFilePath = require.resolve(mainSchemaFileRelativePath)
  allEndpoints.forEach(async endpoint => {
    // do not create operations files for endpoints that had a name change
    if (endpoint.deprecated && endpoint.deprecated.before) {
      return
    }

    const path = endpoint.path.replace(/:(\w+)/g, '{$1}')
    const [scope] = endpoint.documentationUrl.substr(state.baseUrl.length).split('/')

    // TODO: handle "Identical path templates detected" error
    if ([
      '/repos/{owner}/{repo}/labels/{current_name}',
      '/repos/{owner}/{repo}/git/refs/{namespace}',
      '{url}'
    ].includes(path)) {
      return
    }

    _.set(mainSchema.paths, `["${path}"].${endpoint.method.toLowerCase()}`, {
      $ref: `operations/${scope}/${endpoint.idName}.json`
    })

    const nameDeprecation = findEndpointNameDeprecation(allEndpoints, endpoint)
    const operation = convertEndpointToOperation({
      endpoint,
      scope,
      baseUrl: state.baseUrl,
      nameDeprecation
    })

    const operationFilePath = pathResolve(mainSchemaFilePath, '..', 'operations', scope, endpoint.idName) + '.json'
    await ensureFile(operationFilePath)
    await writeJson(operationFilePath, operation, { spaces: 2 })
  })

  // sort paths
  mainSchema.paths = _(mainSchema.paths).toPairs().sortBy(0).fromPairs().value()
  await writeJson(mainSchemaFilePath, mainSchema, { spaces: 2 })
}

function findEndpointNameDeprecation (allEndpoints, { method, path }) {
  const deprecatedEndpoint = allEndpoints.find(endpoint => {
    if (endpoint.method !== method || endpoint.path !== path) {
      return
    }

    return endpoint.deprecated && endpoint.deprecated.before
  })

  if (deprecatedEndpoint) {
    return deprecatedEndpoint.deprecated
  }
}

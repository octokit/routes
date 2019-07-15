const { entries, kebabCase } = require('lodash')

const getEndpoint = require('../lib/endpoint/get')
const { convertEndpointToOperation } = require('../lib/convert-endpoint-to-operation')

module.exports = {
  getAllRoutes,
  getAllRoutesByDocumentUrl,
  getAllDocumentationUrls,
  getScopeRoutes,
  getScopeRoutesByDocumentUrl,
  getRoutesForUrl,
  getGheVersion,
  getBaseUrl,
  getPathPrefix,
  getCacheDir,
  getRoutesRoot,
  getRoutesDir,
  getRouteMap
}

const GHE_VERSION = parseFloat(process.env.GHE_VERSION)

function getGheVersion () {
  return GHE_VERSION
}

function getBaseUrl () {
  const pathPrefix = getPathPrefix()
  return `https://developer.github.com/${pathPrefix}/`
}

function getPathPrefix () {
  const gheVersion = getGheVersion()
  return gheVersion ? `enterprise/${gheVersion}/v3` : 'v3'
}

function getCacheDir () {
  return getRoutesDir()
}

function getRoutesRoot () {
  return 'openapi'
}

function getRoutesDir () {
  const gheVersion = getGheVersion()
  return gheVersion ? `ghe-${gheVersion}` : 'api.github.com'
}

function requireRoutesFile (filePath) {
  const [ routesRoot, routesDir ] = [ getRoutesRoot(), getRoutesDir() ]
  return require(`../${routesRoot}/${routesDir}/${filePath}`)
}

function getAllRoutes () {
  return requireRoutesFile('index.json').paths
}

const CACHED_ROUTES_BY_DOCUMENTATION_URL = entries(getAllRoutes())
  .reduce(reduceByDocumentationUrl, {})
function getAllRoutesByDocumentUrl () {
  return CACHED_ROUTES_BY_DOCUMENTATION_URL
}

function getAllDocumentationUrls () {
  if (process.env.TEST_URL) {
    return process.env.TEST_URL.split(/\s*,\s/)
  }

  return Object.keys(getAllRoutesByDocumentUrl())
}

function getScopeRoutes (scope) {
  const kebabScope = kebabCase(scope)
  return requireRoutesFile(`${kebabScope}.json`)
}

function getScopeRoutesByDocumentUrl (scope) {
  return getScopeRoutes(scope).reduce(reduceByDocumentationUrl, {})
}

function getRoutesForUrl (url) {
  return CACHED_ROUTES_BY_DOCUMENTATION_URL[url]
}

function reduceByDocumentationUrl (map, [ path, methods ]) {
  for (const method of Object.keys(methods)) {
    let operation = getOperation(method)
    const documentationUrl = operation.externalDocs.url
    if (!map[documentationUrl]) {
      map[documentationUrl] = []
    }
    map[documentationUrl].push({ path, method, operation })
  }
  return map

  // TODO: make openapi operations more straightforward to include,
  //       probably via json-schema-ref-parser
  function getOperation (method) {
    let op = methods[method]
    // json-schema-ref-parser does not resolve relative to the index.json file.
    // For now use simple, manual $ref requiring:
    if (op.$ref) {
      const [ routesRoot, routesDir ] = [ getRoutesRoot(), getRoutesDir() ]
      op = require(`../${routesRoot}/${routesDir}/${op.$ref}`)
    }
    return op
  }
}

async function getRouteMap (urls, state) {
  const allEndpoints = []
  const routeMap = new Map()

  await urls.reduce(async (promise, url) => {
    await promise
    const endpoints = await getEndpoint(state, url)
    if (endpoints) {
      allEndpoints.push(...endpoints)
      routeMap.set(url, endpoints)
    }
  }, null)

  for (const [url, endpoints] of routeMap) {
    const formattedEndpoints = formatEndpoints(endpoints, allEndpoints)
    routeMap.set(url, formattedEndpoints)
  }
  return routeMap
}

function formatEndpoints (endpoints, allEndpoints) {
  const goodEndpoints = endpoints.filter(discardBadEndpoints)
  const formattedEndpoints = []
  for (const endpoint of goodEndpoints) {
    formattedEndpoints.push(formatEndpoint(endpoint, allEndpoints))
  }
  return formattedEndpoints.sort(sortByPathThenMethod)
}

function discardBadEndpoints (endpoint, i, endpoints) {
  // Discard routes that have had a name change because the deprecated name is
  // captured in the x-changes section of the openapi operation object
  const isCurrentName = !(endpoint.deprecated && endpoint.deprecated.before)

  // Discard these routes for some reason ¿ @gr2m ?
  const isNotBanned = ![
    '/repos/{owner}/{repo}/labels/{current_name}',
    '/repos/{owner}/{repo}/git/refs/{namespace}',
    '{url}'
  ].includes(endpoint.path)

  // Discard all but the last one of routes that share the same method and path
  // because openapi only supports one operation per method for each path
  // Only way to "fix" this is to change the actual github api
  // As of 15 july 2019, the offenders are:
  //   - post /repos/{owner}/{repo}/pulls
  //     - pulls-create
  //     - pulls-create-from-issue
  //   - post /repos/{owner}/{repo}/pulls/{pull_number}/comments
  //     - pulls-create-comment
  //     - pulls-create-comment-reply
  const isCanonicalOp = checkIfCanonicalOp()

  return isCurrentName && isNotBanned && isCanonicalOp

  function checkIfCanonicalOp () {
    if (endpoints.length === 1) {
      return true
    }
    let count = 0
    let deprecatedCount = 0
    let lastId
    for (const _endpoint of endpoints) {
      if (_endpoint.path === endpoint.path) {
        count++
        _endpoint.deprecated && deprecatedCount++
        lastId = _endpoint.idName
      }
    }
    const hasUniquePath = count - deprecatedCount <= 1
    // Last in wins because there's not a better way
    const isCanonicalOpForNonUniquePath = endpoint.idName === lastId
    return hasUniquePath || isCanonicalOpForNonUniquePath
  }
}

function formatEndpoint (endpoint, allEndpoints) {
  const path = endpoint.path.split('/')
    .map(segment => segment.replace(/:(\w+)/g, '{$1}'))
    .join('/')
  const method = endpoint.method.toLowerCase()
  const [scope] = endpoint.documentationUrl.substr(getBaseUrl().length)
    .split('/')
  const nameDeprecation = findEndpointNameDeprecation(allEndpoints, endpoint)
  const operation = convertEndpointToOperation({
    endpoint,
    scope,
    baseUrl: getBaseUrl(),
    nameDeprecation
  })
  removeUndefinedByReference(operation)
  return { path, method, operation }
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

function removeUndefinedByReference (value) {
  for (const key of Object.keys(value)) {
    if (value[key] === undefined) {
      delete value[key]
    } else if (Array.isArray(value[key])) {
      value[key].forEach(removeUndefinedByReference)
    } else if (typeof value[key] === 'object' && value[key] !== null) {
      removeUndefinedByReference(value[key])
    }
  }
}

function sortByPathThenMethod (a, b) {
  switch (true) {
    case a.path < b.path:
      return -1
    case a.path > b.path:
      return 1
    case a.method < b.method:
      return -1
    case a.method > b.method:
      return 1
  }
  return 0
}

const { entries, kebabCase } = require('lodash')

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
  getRoutesDir,
  wrapOperation
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

function getRoutesDir () {
  const gheVersion = getGheVersion()
  return gheVersion ? `ghe-${gheVersion}` : 'api.github.com'
}

function requireRoutesFile (filePath) {
  const [ routesRoot, routesDir ] = [ '../openapi', getRoutesDir() ]
  return require(`${routesRoot}/${routesDir}/${filePath}`)
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
      const [ routesRoot, routesDir ] = [ '../openapi', getRoutesDir() ]
      op = require(`${routesRoot}/${routesDir}/${op.$ref}`)
    }
    return op
  }
}

function wrapOperation (endpoint) {
  let path = endpoint.path.split('/')
    .map(segment => segment.replace(/^:(.+)$/, '{$1}'))
    .join('/')
  const method = endpoint.method.toLowerCase()
  const [scope] = endpoint.documentationUrl.substr(getBaseUrl().length)
    .split('/')
  const operation = convertEndpointToOperation({
    endpoint,
    scope,
    baseUrl: getBaseUrl()
  })
  removeUndefinedByReference(operation)
  return { path, method, operation }
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

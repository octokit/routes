const { flatten, kebabCase } = require('lodash')

module.exports = {
  getAllRoutesByScope,
  getAllRoutesByDocumentUrl,
  getAllDocumentationUrls,
  getScopeRoutes,
  getScopeRoutesByDocumentUrl,
  getRoutesForUrl,
  getGheVersion,
  getBaseUrl,
  getPathPrefix,
  getCacheDir,
  getRoutesDir
}

const GHE_VERSION = parseFloat(process.env.GHE_VERSION)
const SCOPES = Object.keys(getAllRoutesByScope())

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
  const [ routesRoot, routesDir ] = [ '../routes', getRoutesDir() ]
  return require(`${routesRoot}/${routesDir}/${filePath}`)
}

function getAllRoutesByScope () {
  return requireRoutesFile('index.json')
}

const CACHED_ROUTES_BY_DOCUMENTATION_URL = flatten(
  SCOPES.map(scope => getAllRoutesByScope()[scope])
).reduce(reduceByDocumentationUrl, {})
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
  const matches = url.match(/\/v3\/([^/#]+)((\/[^/#]+)*)/)
  const scope = kebabCase(matches[1])
  const routes = CACHED_ROUTES_BY_DOCUMENTATION_URL[url]
  const idNames = routes.map(route => route.idName)

  return idNames.map(
    idName => requireRoutesFile(`${scope}/${idName}.json`)
  )
}

function reduceByDocumentationUrl (map, endpoint) {
  const documentationUrl = endpoint.documentationUrl
  if (!map[documentationUrl]) {
    map[documentationUrl] = []
  }
  map[documentationUrl].push(endpoint)

  return map
}

const { flatten, kebabCase } = require('lodash')

module.exports = {
  getAllRoutesByScope,
  getAllRoutesByDocumentUrl,
  getAllDocumentationUrls,
  getScopeRoutes,
  getScopeRoutesByDocumentUrl,
  getRoutesForUrl
}

const SCOPES = Object.keys(getAllRoutesByScope())

function getAllRoutesByScope () {
  return require('../routes/api.github.com/index.json')
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
  return require(`../routes/api.github.com/${kebabCase(scope)}.json`)
}

function getScopeRoutesByDocumentUrl (scope) {
  return getScopeRoutes(scope).reduce(reduceByDocumentationUrl, {})
}

function getRoutesForUrl (url) {
  const matches = url.match(/\/v3\/([^/#]+)((\/[^/#]+)*)/)
  const scope = kebabCase(matches[1])
  const routes = CACHED_ROUTES_BY_DOCUMENTATION_URL[url]
  const idNames = routes.map(route => route.idName)

  return idNames.map(idName => require(`../routes/api.github.com/${scope}/${idName}.json`))
}

function reduceByDocumentationUrl (map, endpoint) {
  const documentationUrl = endpoint.documentationUrl
  if (!map[documentationUrl]) {
    map[documentationUrl] = []
  }
  map[documentationUrl].push(endpoint)

  return map
}

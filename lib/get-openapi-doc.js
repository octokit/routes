module.exports = getDoc

const { resolve: pathResolve } = require('path')
const { readdirSync } = require('fs')

const PUBLIC_API = 'api.github.com'
const APIS = readdirSync(pathResolve(__dirname, '..', 'openapi'))

function getApi (rawApi) {
  if (!rawApi) {
    return PUBLIC_API
  }
  const api = !isNaN(rawApi) ? `ghe-${rawApi}` : rawApi
  if (APIS.includes(api)) {
    return api
  }
  throw new Error(`"${rawApi}" is not a valid API. Must be one of: "${APIS.join('", "')}".`)
}

function getDoc (rawApi) {
  const api = getApi(rawApi)
  const doc = require(`../openapi/${api}/index.json`)
  for (const path of Object.keys(doc.paths)) {
    for (const method of Object.keys(doc.paths[path])) {
      const op = doc.paths[path][method]
      if (doc.paths[path][method].$ref) {
        doc.paths[path][method] = require(`../openapi/${api}/${op.$ref}`)
      }
    }
  }
  return doc
}

module.exports = getOperationId

// const { kebabCase } = require('lodash')

const toIdName = require('./to-id-name')

function getOperationId (rawMethod, path, rawScope, summary) {
  const method = rawMethod.toUpperCase()
  // const scope = kebabCase(rawScope)
  const scope = rawScope
  const idName = toIdName({ method, path, scope, name: summary })
  return `${scope}-${idName}`
}

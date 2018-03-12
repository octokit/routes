module.exports = pageToRoutesFilename

const _ = require('lodash')

function pageToRoutesFilename (page) {
  return _.kebabCase(
    [page.scope, page.subScope]
      .filter(Boolean)
      .join('-')
  )
    .replace(/\bgit-hub\b/, 'github') + '.json'
}

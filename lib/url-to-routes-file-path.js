module.exports = urlToRoutesFilePath

const { kebabCase } = require('lodash')
const { join: joinPath } = require('path')

/**
 * https://developer.github.com/v3/repos/#get
 * => {scope: 'repos', path: '', id: 'get'}
 * https://developer.github.com/v3/repos/branches/#get-branch
 * => {scope: 'repos', path: '/branches', id: 'get'}
 */
function urlToRoutesFilePath (state, endpoint) {
  const [, scope] = endpoint.documentationUrl.match(/\/v3\/([^/#]+)((\/[^/#]+)*)/)
  return joinPath(
    __dirname,
    '..',
    'routes',
    state.folderName,
    kebabCase(scope),
    `${endpoint.idName}.json`
  )
}

const { readdirSync } = require('fs')

const { ensureFile, writeFile, writeJson } = require('fs-extra')
const { pick } = require('lodash')

const { getDoc } = require('../lib/openapi')
const pkg = require('../package.json')

buildDistFiles()

async function buildDistFiles () {
  const versions = readdirSync('openapi')

  const exports = []
  for (const version of versions) {
    const result = getDoc(version)
    const path = `dist/${version}.json`
    await ensureFile(path)
    await writeJson(path, result, { spaces: 2 })
    exports.push(`'${version}': require("./${version}.json")`)
  }

  writeFile('dist/index.js', `module.exports = {\n  ${exports.join(',\n  ')}\n}\n`)
  writeJson('dist/package.json', pick(pkg, [
    'name',
    'version',
    'publishConfig',
    'description',
    'author',
    'repository',
    'keywords',
    'license',
    'bugs',
    'homepage'
  ]), { spaces: 2 })
}

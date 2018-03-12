#!/usr/bin/env node

const {writeFileSync} = require('fs')
const {join: joinPath} = require('path')

const mkdirp = require('mkdirp')

const getDocPages = require('../lib/landing-page/get')
const getEndpoints = require('../lib/documentation-page/get')
const toRoutesFilename = require('../lib/page-to-routes-filename')

mkdirp.sync('cache')
mkdirp.sync('routes')

main()
  .catch(error => console.log(error.stack))

async function main () {
  console.log(`🔍  Finding documentation pages`)
  const pages = await getDocPages()
  console.log(`🤖  ${pages.length} pages found`)

  const filePaths = []
  await pages.reduce(async (promise, page, i) => {
    await promise

    console.log('')
    console.log(`🔭  ${i + 1}/${pages.length}: ${page.url}`)
    const endpoints = await getEndpoints(page)

    if (endpoints.length === 0) {
      console.log(`ℹ️  No endpoints found`)
      return
    }

    const filename = toRoutesFilename(page)
    const filePath = joinPath('routes', filename)
    writeFileSync(filePath, JSON.stringify(endpoints, null, 2))
    console.log(`✅  ${filename} written`)
    filePaths.push(filePath)
  }, Promise.resolve())

  const pathByScope = filePaths.reduce((map, path) => {
    const [scope] = path.substr('routes/'.length).split(/[-.]/)
    if (!map[scope]) map[scope] = []
    map[scope].push(`require(./${path})`)
    return map
  }, {})

  const indexFileContent = JSON.stringify(pathByScope, null, 2)
    .replace(/\]/g, ')')
    .replace(/"(\w+)": \[/g, '$1: [].concat(')
    .replace(/"require\(([^)]+)\)"/g, 'require(\'$1\')')

  // update main index.js file which loads all routes specificatiosn
  writeFileSync('index.js', `module.exports = ${indexFileContent}\n`)
}

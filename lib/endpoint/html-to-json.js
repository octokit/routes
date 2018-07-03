module.exports = htmlToJson

const {readJson} = require('fs-extra')
const joinPath = require('path').join

const cheerio = require('cheerio')

const elementToBlock = require('./element-to-block')
const findDescription = require('./find-description')
const findParameters = require('./find-parameters')
const findResponse = require('./find-response')
const findRoutes = require('./find-routes')
const htmlContainsEndpoint = require('./html-contains-endpoint')

async function htmlToJson (html) {
  const override = await findOverride(html)
  if (override) {
    override.forEach(endpoint => {
      endpoint.isOverride = true
    })
    return override
  }

  if (!htmlContainsEndpoint(html)) {
    return
  }

  const $ = cheerio.load(html)

  const result = {}
  const state = {
    results: [result],
    blocks: $('body > *')
      .map((i, el) => {
        const block = elementToBlock(el)

        if (!block) {
          throw new Error('Could not identify block type for:\n' + cheerio.html(el))
        }

        return block
      })
      .get()
  }

  // first block is always the title block, which
  // also includes the "enabledForApps" flag
  const {text: name, enabledForApps} = state.blocks[0]
  result.name = name
  result.enabledForApps = enabledForApps

  // remove title block so we can keep track of blocks we haven’t parsed yet
  state.blocks.splice(0, 1)

  // mutate results
  findRoutes(state)
  findParameters(state)
  findDescription(state)
  findResponse(state)

  return state.results
}

function findOverride (html) {
  if (!html.startsWith('<!--')) {
    return
  }

  const overridePath = html.match(/custom override at (.*)/).pop()
  return readJson(joinPath(process.cwd(), overridePath))
}

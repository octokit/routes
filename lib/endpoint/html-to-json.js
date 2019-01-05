module.exports = htmlToJson

const cheerio = require('cheerio')

const addTriggersNotificationFlag = require('./add-triggers-notification-flag')
const elementToBlock = require('./element-to-block')
const findDescription = require('./find-description')
const findParameters = require('./find-parameters')
const findPreviews = require('./find-previews')
const findResponse = require('./find-response')
const findRoutes = require('./find-routes')
const htmlContainsEndpoint = require('./html-contains-endpoint')
const workarounds = require('./overrides/workarounds')
const deprecations = require('./overrides/deprecations')

async function htmlToJson (html) {
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
  const { text: name, enabledForApps } = state.blocks[0]
  result.name = name
  result.enabledForApps = enabledForApps

  // remove title block so we can keep track of blocks we haven’t parsed yet
  state.blocks.splice(0, 1)

  // mutate results
  findRoutes(state)
  findPreviews(state)
  findParameters(state)
  findDescription(state)
  findResponse(state)
  addTriggersNotificationFlag(state)
  workarounds(state)
  deprecations(state)

  return state.results
}

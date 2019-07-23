module.exports = htmlToJson

const cheerio = require('cheerio')
const { URL } = require('url')

const addTriggersNotificationFlag = require('./add-triggers-notification-flag')
const elementToBlock = require('./element-to-block')
const findDescription = require('./find-description')
const findIsGitHubCloud = require('./find-is-github-cloud')
const findParameters = require('./find-parameters')
const findPreviews = require('./find-previews')
const findResponse = require('./find-response')
const findRoutes = require('./find-routes')
const findDeprecationNotices = require('./find-deprecation-notices')
const htmlContainsEndpoint = require('./html-contains-endpoint')
const workarounds = require('./overrides/workarounds')

async function htmlToJson (html, { gheVersion, pageUrl }) {
  if (!htmlContainsEndpoint(html)) {
    return
  }

  const $ = cheerio.load(html)

  const result = {}
  const state = {
    gheVersion,
    pageOrigin: pageUrl.replace(new URL(pageUrl).pathname, ''),
    pageUrl,
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
  findIsGitHubCloud(state)
  findRoutes(state)
  findDeprecationNotices(state)
  findPreviews(state)
  findParameters(state)
  findDescription(state)
  findResponse(state)
  addTriggersNotificationFlag(state)
  workarounds(state)

  return state.results
}

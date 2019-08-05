module.exports = htmlToJson

const cheerio = require('cheerio')
const { URL } = require('url')

const addCodeSamples = require('./add-code-samples')
const addTriggersNotificationFlag = require('./add-triggers-notification-flag')
const elementToBlock = require('./element-to-block')
const findAcceptHeader = require('./find-accept-header')
const findDescription = require('./find-description')
const findIsGitHubCloud = require('./find-is-github-cloud')
const findParameters = require('./find-parameters')
const findResponse = require('./find-response')
const findRoutes = require('./find-routes')
const findDeprecationNotices = require('./find-deprecation-notices')
const htmlContainsEndpoint = require('./html-contains-endpoint')
const workarounds = require('./overrides/workarounds')

async function htmlToJson (html, { baseUrl, gheVersion, documentationUrl }) {
  if (!htmlContainsEndpoint(html)) {
    return
  }

  const $ = cheerio.load(html)
  const [pageUrl, pageFragment] = documentationUrl.split('#')
  const pageOrigin = pageUrl.replace(new URL(pageUrl).pathname, '')
  const scope = documentationUrl.match(/\/v3\/([^/#]+)/).pop()
  const state = {
    baseUrl,
    gheVersion,
    pageOrigin,
    pageUrl,
    pageFragment,
    scope,
    routes: [{}],
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
  const { text: summary, enabledForApps } = state.blocks[0]
  Object.assign(state.routes[0], {
    method: null,
    path: null,
    operation: {
      summary,
      description: null,
      operationId: null,
      tags: [ scope ],
      externalDocs: {
        description: 'API method documentation',
        url: documentationUrl
      },
      parameters: [],
      responses: {},
      'x-code-samples': [],
      'x-github': {
        legacy: null,
        enabledForApps,
        githubCloudOnly: null
      },
      'x-changes': []
    }
  })

  // remove title block so we can keep track of blocks we haven’t parsed yet
  state.blocks.splice(0, 1)

  // mutate results
  findIsGitHubCloud(state)
  findRoutes(state)
  findParameters(state)
  findAcceptHeader(state)
  findDescription(state)
  findResponse(state)
  findDeprecationNotices(state)
  addTriggersNotificationFlag(state)
  addCodeSamples(state)
  workarounds(state)

  return state.routes
}

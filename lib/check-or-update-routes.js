module.exports = checkOrUpdateRoutes

const Cache = require('./cache')
const getEndpoint = require('./endpoint/get')
const getGheVersions = require('./get-ghe-versions')
const parseUrlsOption = require('./options/urls')

async function checkOrUpdateRoutes (options) {
  if (!options.urls && !options.cached) {
    console.log(`🔍  Looking for URLs (this might take a while)`)
  }

  const [baseUrl, folderName] = options.ghe
    ? [`https://developer.github.com/enterprise/${options.ghe}/v3/`, `ghe-${options.ghe}`]
    : ['https://developer.github.com/v3/', 'api.github.com']

  const state = {
    baseUrl,
    folderName,
    cache: new Cache(folderName),
    memoryCache: {},
    checkOnly: options.checkOnly,
    cached: options.cached,
    gheVersion: parseFloat(options.ghe)
  }

  if (options.ghe === '') {
    console.log('ℹ️  Loading GitHub Enterprise versions')
    const gheVersions = await getGheVersions(state)

    for (let index = 0; index < gheVersions.length; index++) {
      const ghe = gheVersions[index]
      console.log(`ℹ️  Updating routes for GitHub Enterprise ${ghe}`)
      await checkOrUpdateRoutes({
        ...options,
        ghe
      })
    }

    return
  }

  const urls = await parseUrlsOption(state, options.urls)
  console.log(`🤖  Looking for sections at ${urls.length} URLs`)

  const allEndpoints = []
  await urls.reduce(async (promise, url) => {
    await promise

    console.log(`🌐  ${url}`)
    const endpoints = await getEndpoint(state, url)

    if (!endpoints) {
      console.log('ℹ️  No endpoints')
      return
    }

    allEndpoints.push(...endpoints)
  }, null)

  console.log('')
  console.log('🏁  done')

  console.log(`ℹ️  Updating OpenAPI specifications`)
  console.log(`\nallEndpoints ==============================`)
  console.log(allEndpoints)
}

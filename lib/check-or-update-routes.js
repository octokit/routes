module.exports = checkOrUpdateRoutes

const { resolve: pathResolve } = require('path')

const { set } = require('lodash')
const { writeFile } = require('fs-extra')
const toJsonSchema = require('easy-json-schema')

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
  console.log(JSON.stringify(allEndpoints, null, 2))

  const mainSchema = require('../openApi')
  const mainSchemaFilePath = require.resolve('../openApi')
  allEndpoints.forEach(async endpoint => {
    const path = endpoint.path.replace(/:(\w+)/g, '{$1}')
    const [scope] = endpoint.documentationUrl.substr(state.baseUrl.length).split('/')
    set(mainSchema.paths, `${path}.${endpoint.method.toLowerCase()}`, {
      $ref: `operations/${scope}/${endpoint.idName}.json`
    })

    const jsonSchema = toJsonSchema(endpoint.responses[0].body)
    console.log(jsonSchema)

    const operationFilePath = pathResolve(mainSchemaFilePath, '..', 'operations', scope, endpoint.idName) + '.json'
    const operation = {
      summary: endpoint.name,
      description: endpoint.description,
      operationId: endpoint.idName,
      tags: [scope],
      externalDocs: {
        description: 'API method documentation',
        url: endpoint.documentationUrl
      },
      parameters: endpoint.params.map(param => {
        return {
          name: param.name,
          in: param.location,
          schema: {
            type: param.type
          },
          required: param.required,
          description: param.description
        }
      }),
      'x-code-samples': [
        {
          lang: 'Shell',
          source: 'curl https://api.github.com/repos/octocat/hello-world/issues/1'
        },
        {
          lang: 'JS',
          source: "client.issues.get({\n  owner: 'octocat',\n  repo: 'hello-world',\n  number: 1\n})"
        }
      ],
      responses: {
        200: {
          content: {
            'application/json': {
              schema: {
                properties: jsonSchema.properties
              }
            }
          }
        }
      }
    }
    // await writeFile(operationFilePath, JSON.stringify(operation, null, 2) + '\n')
  })

  await writeFile(mainSchemaFilePath, JSON.stringify(mainSchema, null, 2) + '\n')

  // TODO
  // - [x] Update openapi/index.json#paths
  // - [ ] Create operations/<scope>/<idName>.json
}


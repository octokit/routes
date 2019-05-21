module.exports = checkOrUpdateRoutes

const { resolve: pathResolve } = require('path')
const { resolve: urlResolve } = require('url')

const _ = require('lodash')
const { writeFile } = require('fs-extra')
const toJsonSchema = require('generate-schema').json
const urlTemplate = require('url-template')

const Cache = require('./cache')
const getEndpoint = require('./endpoint/get')
const getGheVersions = require('./get-ghe-versions')
const parseUrlsOption = require('./options/urls')

// https://github.com/lodash/lodash/issues/1244#issuecomment-271850316
function mapValuesDeep (v, callback) {
  return _.isObject(v)
    ? _.mapValues(v, v => mapValuesDeep(v, callback))
    : callback(v)
}

// TODO: find a better place to define parameter examples
const PARAMETER_EXAMPLES = {
  owner: 'octocat',
  repo: 'hello-world',
  issue_number: 1
}

function toShellExample (state, endpoint) {
  const path = urlTemplate.parse(endpoint.path).expand(PARAMETER_EXAMPLES)
  return `curl -H"Accept: application/vnd.github.v3+json" ${urlResolve(state.baseUrl, path)}`
}

function toJsExample (state, endpoint) {
  const params = endpoint.params
    .filter(param => !param.deprecated)
    .map(param => `${param.name}: ${JSON.stringify(PARAMETER_EXAMPLES[param.name])}`)
    .join(', ')

  return `octokit.issues.get({${params}})`
}

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

  const mainSchema = require('../openApi')
  const mainSchemaFilePath = require.resolve('../openApi')
  allEndpoints.forEach(async endpoint => {
    const path = endpoint.path.replace(/:(\w+)/g, '{$1}')
    const [scope] = endpoint.documentationUrl.substr(state.baseUrl.length).split('/')
    _.set(mainSchema.paths, `${path}.${endpoint.method.toLowerCase()}`, {
      $ref: `operations/${scope}/${endpoint.idName}.json`
    })

    // WORKAROUND: speccy does not like {"type": null}
    const jsonSchema = mapValuesDeep(
      toJsonSchema(endpoint.responses[0].body),
      value => value === 'null' ? 'string' : value
    )

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
      parameters: endpoint.params
        .filter(param => !param.deprecated)
        .map(param => {
          return {
            name: param.name,
            in: param.location === 'url' ? 'path' : param.location,
            schema: {
              type: param.type
            },
            required: param.required,
            description: param.description || `${param.name} parameter`
          }
        }),
      'x-code-samples': [
        {
          lang: 'Shell',
          source: toShellExample(state, endpoint)
        },
        {
          lang: 'JS',
          source: toJsExample(state, endpoint)
        }
      ],
      responses: {
        200: {
          description: 'response',
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
    await writeFile(operationFilePath, JSON.stringify(operation, null, 2) + '\n')
  })

  await writeFile(mainSchemaFilePath, JSON.stringify(mainSchema, null, 2) + '\n')

  // TODO
  // - [x] Update openapi/index.json#paths
  // - [ ] Create operations/<scope>/<idName>.json
}

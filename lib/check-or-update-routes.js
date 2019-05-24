module.exports = checkOrUpdateRoutes

const { resolve: pathResolve } = require('path')
const { resolve: urlResolve } = require('url')

const _ = require('lodash')
const { writeJson, ensureFile } = require('fs-extra')
const toJsonSchema = require('generate-schema').json
const urlTemplate = require('url-template')
const { stringify } = require('javascript-stringify')

const Cache = require('./cache')
const getEndpoint = require('./endpoint/get')
const getGheVersions = require('./get-ghe-versions')
const parseUrlsOption = require('./options/urls')

// https://github.com/lodash/lodash/issues/1244#issuecomment-271850316
// function mapValuesDeep (v, callback) {
//   return _.isObject(v)
//     ? _.mapValues(v, v => mapValuesDeep(v, callback))
//     : callback(v)
// }

const mapValuesDeep = (v, callback) => {
  if (_.isArray(v)) {
    return v.map(innerObj => mapValuesDeep(innerObj, callback))
  }

  return _.isObject(v)
    ? _.mapValues(v, v => mapValuesDeep(v, callback))
    : callback(v)
}

// TODO: find a better place to define parameter examples
const PARAMETER_EXAMPLES = {
  owner: 'octocat',
  repo: 'hello-world',
  issue_number: 1,
  title: 'title'
}

function toShellExample (state, { endpoint }) {
  const path = urlTemplate.parse(endpoint.path.replace(/:(\w+)/, '{$1}')).expand(PARAMETER_EXAMPLES)
  const params = endpoint.params
    .filter(param => !param.deprecated)
    .filter(param => param.location === 'body')
    .filter(param => param.required)
    .reduce((params, param) => Object.assign(params, {
      [param.name]: PARAMETER_EXAMPLES[param.name] || param.name
    }), {})

  const args = [
    endpoint.method !== 'GET' && `-X${endpoint.method}`,
    '-H"Accept: application/vnd.github.v3+json"',
    urlResolve(state.baseUrl, path),
    Object.keys(params).length && `-d '${JSON.stringify(params)}'`
  ].filter(Boolean)
  return `curl \\\n  ${args.join(' \\\n  ')}`
}

function toJsExample (state, { scope, endpoint }) {
  const params = endpoint.params
    .filter(param => !param.deprecated)
    .filter(param => param.required)
    .reduce((params, param) => Object.assign(params, {
      [param.name]: PARAMETER_EXAMPLES[param.name] || param.name
    }), {})

  return `octokit.${scope}.get(${Object.keys(params).length ? stringify(params, null, 2) : ''})`
}

function hasRequestBody (endpoint) {
  return !!endpoint.params.find(param => param.location === 'body')
}

function requiredRequestBodyParams (endpoint) {
  const required = endpoint.params
    .filter(param => !param.deprecated)
    .filter(param => param.required)
    .filter(param => param.location === 'body')
    .map(param => param.name)

  if (required.length === 0) {
    return undefined
  }

  return required
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

    // TODO: handle "Identical path templates detected" error
    if ([
      '/repos/{owner}/{repo}/labels/{current_name}',
      '/repos/{owner}/{repo}/git/refs/{namespace}',
      '/repos/{owner}/{repo}/commits/{sha}/comments',
      '/repos/{owner}/{repo}/commits/{ref}',
      '{url}'
    ].includes(path)) {
      return
    }

    _.set(mainSchema.paths, `["${path}"].${endpoint.method.toLowerCase()}`, {
      $ref: `operations/${scope}/${endpoint.idName}.json`
    })

    // WORKAROUND: speccy does not like {"type": null}
    const jsonSchema = mapValuesDeep(
      toJsonSchema(_.get(endpoint, 'responses[0].body')),
      value => value === 'null' ? 'string' : value
    )

    const operationFilePath = pathResolve(mainSchemaFilePath, '..', 'operations', scope, endpoint.idName) + '.json'

    const operation = {
      summary: endpoint.name,
      description: endpoint.description,
      operationId: [scope, endpoint.idName].join('-'),
      tags: [scope],
      externalDocs: {
        description: 'API method documentation',
        url: endpoint.documentationUrl
      },
      parameters: endpoint.params
        .filter(param => !param.deprecated)
        // body parameters go "requestBody"
        .filter(param => param.location !== 'body')
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
      requestBody: hasRequestBody(endpoint) ? {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: endpoint.params
                .filter(param => !param.deprecated)
                .filter(param => param.location === 'body')
                .reduce((schema, param) => {
                  const addition = {
                    description: param.description || `${param.name} parameter`
                  }

                  if (param.type.includes('[]')) {
                    addition.type = 'array'
                    addition.items = {
                      type: param.type.replace('[]', '')
                    }
                  }

                  return Object.assign(schema, {
                    [param.name]: addition
                  })
                }, {}),
              required: requiredRequestBodyParams(endpoint)
            }
          }
        }
      } : undefined,
      'x-code-samples': [
        {
          lang: 'Shell',
          source: toShellExample(state, { scope, endpoint })
        },
        {
          lang: 'JS',
          source: toJsExample(state, { scope, endpoint })
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
    await ensureFile(operationFilePath)
    await writeJson(operationFilePath, operation, { spaces: 2 })
  })

  // sort paths
  mainSchema.paths = _(mainSchema.paths).toPairs().sortBy(0).fromPairs().value()
  await writeJson(mainSchemaFilePath, mainSchema, { spaces: 2 })

  // TODO
  // - [x] Update openapi/index.json#paths
  // - [ ] Create operations/<scope>/<idName>.json
}

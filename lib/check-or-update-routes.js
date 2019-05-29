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

  const requiredPreviewHeaders = endpoint.previews.filter(preview => preview.required)
  const defaultAcceptHeader = requiredPreviewHeaders.length
    ? requiredPreviewHeaders.map(header => `application/vnd.github.${header.name}-preview+json`).join(',')
    : 'application/vnd.github.v3+json'

  const args = [
    endpoint.method !== 'GET' && `-X${endpoint.method}`,
    `-H"Accept: ${defaultAcceptHeader}"`,
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

function requiredProperties (params) {
  const required = params
    .filter(param => !param.deprecated)
    .filter(param => param.required)
    .filter(param => param.location === 'body')
    .map(param => param.name)
    .filter(name => !name.includes('.'))

  if (required.length === 0) {
    return undefined
  }

  return required
}

function isGitHubCloudOnly (endpoint) {
  const scimRoute = /^\/scim\//.test(endpoint.path)
  const hasGitHubEnterpriseNote = /is available to organizations with GitHub Enterprise Cloud/.test(endpoint.description)

  if (scimRoute || hasGitHubEnterpriseNote) {
    return true
  }

  return false
}

function findEndpointNameDeprecation (allEndpoints, { method, path }) {
  const deprecatedEndpoint = allEndpoints.find(endpoint => {
    if (endpoint.method !== method || endpoint.path !== path) {
      return
    }

    return endpoint.deprecated && endpoint.deprecated.before
  })

  if (deprecatedEndpoint) {
    return deprecatedEndpoint.deprecated
  }
}

function paramsToProperties (params) {
  return params
    .filter(param => !param.name.includes('.'))
    .reduce((properties, param) => {
      const isArrayParam = param.type.includes('[]')
      const addition = {
        description: param.description || `${param.name} parameter`,
        type: param.type,
        enum: param.enum
      }

      if (param.allowNull) {
        addition.nullable = true
      }

      if (isArrayParam) {
        addition.type = 'array'
        addition.items = {
          type: param.type.replace('[]', '')
        }

        if (addition.items.type === 'object') {
          const prefix = param.name + '[].'
          addition.items.properties = paramsToProperties(
            params
              .filter(({ name }) => name.startsWith(prefix))
              .map(p => Object.assign({}, p, { name: p.name.substr(prefix.length) }))
          )
          addition.items.required = requiredProperties(
            params
              .filter(({ name }) => name.startsWith(prefix))
              .map(p => Object.assign({}, p, { name: p.name.substr(prefix.length) }))
          )
        }
      }

      if (param.regex) {
        if (isArrayParam) {
          addition.items.pattern = param.regex
        } else {
          addition.pattern = param.regex
        }
      }

      if (addition.type === 'object') {
        const prefix = param.name + '.'
        addition.properties = paramsToProperties(
          params
            .filter(({ name }) => name.startsWith(prefix))
            .map(p => Object.assign({}, p, { name: p.name.substr(prefix.length) }))
        )
        addition.required = requiredProperties(
          params
            .filter(({ name }) => name.startsWith(prefix))
            .map(p => Object.assign({}, p, { name: p.name.substr(prefix.length) }))
        )
      }

      return Object.assign(properties, {
        [param.name]: addition
      })
    }, {})
}

function toRequestBodyParameterName (endpoint) {
  const paramSentAsRoot = endpoint.params.find(param => param.mapTo === 'input')

  if (paramSentAsRoot) {
    return paramSentAsRoot.name
  }
}

function toRequestBodySchema (endpoint) {
  const paramSentAsRoot = endpoint.params.find(param => param.mapTo === 'input')

  // All cases are arrays of strings
  if (paramSentAsRoot) {
    const description = paramSentAsRoot.description || `${paramSentAsRoot.name} parameter`

    if (paramSentAsRoot.type.includes('[]')) {
      return {
        type: 'array',
        items: {
          type: paramSentAsRoot.type.substr(0, paramSentAsRoot.type.length - 2)
        },
        description
      }
    }

    return {
      type: paramSentAsRoot.type,
      description
    }
  }

  return {
    type: 'object',
    properties: paramsToProperties(
      endpoint.params
        .filter(param => !param.deprecated)
        .filter(param => param.location === 'body')
    ),
    required: requiredProperties(endpoint.params)
  }
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
    // do not create operations files for endpoints that had a name change
    if (endpoint.deprecated && endpoint.deprecated.before) {
      return
    }

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

    const statusCode = endpoint.responses && endpoint.responses.length && parseInt(endpoint.responses[0].headers.status.split(' ')[0], 10)

    const responses = statusCode === 204
      ? { 204: { description: 'Empty response' } }
      : statusCode
        ? {
          [endpoint.responses[0].headers.status.split(' ')[0]]: {
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
        // workaround: the "responses" property is required
        // Until we get responses for all endpoints, we do a 418 placeholder response
        : {
          418: {
            description: 'Response definition missing'
          }
        }

    const operationFilePath = pathResolve(mainSchemaFilePath, '..', 'operations', scope, endpoint.idName) + '.json'

    const parameters = endpoint.params
      .filter(param => !param.deprecated)
      // body parameters go "requestBody"
      .filter(param => param.location !== 'body')
      .map(param => {
        return {
          name: param.name,
          in: param.location === 'url' ? 'path' : param.location,
          schema: {
            type: param.type,
            enum: param.enum
          },
          required: param.required,
          nullable: param.allowNull,
          description: param.description || `${param.name} parameter`
        }
      })

    const requiredPreviewHeaders = endpoint.previews.filter(preview => preview.required)
    const defaultAcceptHeader = requiredPreviewHeaders.length
      ? requiredPreviewHeaders.map(header => `application/vnd.github.${header.name}-preview+json`).join(',')
      : 'application/vnd.github.v3+json'
    const acceptHeaderParam = {
      name: 'accept',
      description: requiredPreviewHeaders.length ? 'This API is under preview and subject to change.' : 'Setting to `application/vnd.github.v3+json` is recommended',
      in: 'header',
      schema: {
        type: 'string',
        default: defaultAcceptHeader
      }
    }

    if (requiredPreviewHeaders.length) {
      acceptHeaderParam.required = true
    }

    if (endpoint.headers) {
      // this is currently only needed for "Render a Markdown document in raw mode"
      Object.entries(endpoint.headers).forEach(([header, value]) => {
        parameters.unshift({
          name: header,
          description: `Setting ${header} header is required for this endpoint`,
          in: 'header',
          schema: {
            type: 'string',
            enum: [value]
          }
        })
      })
    }

    parameters.unshift(acceptHeaderParam)

    const changes = []

    if (endpoint.deprecated) {
      changes.push({
        date: endpoint.deprecated.date,
        type: 'deprecation',
        note: endpoint.deprecated.message
      })
    }

    const nameDeprecation = findEndpointNameDeprecation(allEndpoints, endpoint)

    if (nameDeprecation) {
      changes.push({
        type: 'idName',
        date: nameDeprecation.date,
        note: nameDeprecation.message,
        meta: {
          before: nameDeprecation.before,
          after: nameDeprecation.after
        }
      })
    }

    const parameterDeprecations = endpoint.params
      .filter(param => param.deprecated)
      .map(param => param.deprecated)

    parameterDeprecations.forEach(deprecation => {
      changes.push({
        type: 'parameter',
        date: deprecation.date,
        note: deprecation.message,
        meta: {
          before: deprecation.before.name,
          after: deprecation.after.name
        }
      })
    })

    const operation = {
      summary: endpoint.name,
      description: endpoint.description,
      operationId: [scope, endpoint.idName].join('-'),
      tags: [scope],
      externalDocs: {
        description: 'API method documentation',
        url: endpoint.documentationUrl
      },
      parameters,
      requestBody: hasRequestBody(endpoint) ? {
        content: {
          'application/json': {
            schema: toRequestBodySchema(endpoint)
          }
        }
      } : undefined,
      responses,
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
      'x-github': {
        legacy: /-legacy$/.test(endpoint.idName),
        githubCloudOnly: isGitHubCloudOnly(endpoint),
        requestBodyParameterName: toRequestBodyParameterName(endpoint)
      },
      'x-changes': _.sortBy(changes, 'date')
    }

    await ensureFile(operationFilePath)
    await writeJson(operationFilePath, operation, { spaces: 2 })
  })

  // sort paths
  mainSchema.paths = _(mainSchema.paths).toPairs().sortBy(0).fromPairs().value()
  await writeJson(mainSchemaFilePath, mainSchema, { spaces: 2 })
}

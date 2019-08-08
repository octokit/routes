module.exports = {
  getDoc,
  convertEndpointToOperation,
  findEndpointNameDeprecation
}

const { resolve: pathResolve } = require('path')
const { readdirSync } = require('fs')
const { URL } = require('url')

const _ = require('lodash')
const toJsonSchema = require('generate-schema').json
const urlTemplate = require('url-template')
const { stringify } = require('javascript-stringify')
const { camelCase } = require('change-case')

const PUBLIC_API = 'api.github.com'
const APIS = readdirSync(pathResolve(__dirname, '..', 'openapi'))

const mapValuesDeep = (v, callback) => {
  if (_.isArray(v)) {
    return v.map(innerObj => mapValuesDeep(innerObj, callback))
  }

  return _.isObject(v)
    ? _.mapValues(v, v => mapValuesDeep(v, callback))
    : callback(v)
}

function getApi (rawApi) {
  if (!rawApi) {
    return PUBLIC_API
  }
  const api = !isNaN(rawApi) ? `ghe-${rawApi}` : rawApi
  if (APIS.includes(api)) {
    return api
  }
  throw new Error(`"${rawApi}" is not a valid API. Must be one of: "${APIS.join('", "')}".`)
}

function getDoc (rawApi) {
  const api = getApi(rawApi)
  const doc = require(`../openapi/${api}/index.json`)
  for (const path of Object.keys(doc.paths)) {
    for (const method of Object.keys(doc.paths[path])) {
      const op = doc.paths[path][method]
      if (doc.paths[path][method].$ref) {
        doc.paths[path][method] = require(`../openapi/${api}/${op.$ref}`)
      }
    }
  }
  return doc
}

// TODO: find a better place to define parameter examples
const PARAMETER_EXAMPLES = {
  owner: 'octocat',
  repo: 'hello-world',
  issue_number: 1,
  title: 'title'
}

function convertEndpointToOperation (params) {
  const { endpoint, scope, baseUrl, nameDeprecation } = params

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
          enum: param.enum,
          default: param.default
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

  const operationId = [camelCase(scope), camelCase(endpoint.idName)].join('.')
  const codeSampleParams = { operationId, endpoint, baseUrl }

  const operation = {
    summary: endpoint.name,
    description: endpoint.description,
    operationId,
    tags: [scope],
    externalDocs: {
      description: 'API method documentation',
      url: endpoint.documentationUrl
    },
    parameters,
    responses,
    'x-code-samples': [
      {
        lang: 'Shell',
        source: toShellExample(codeSampleParams)
      },
      {
        lang: 'JS',
        source: toJsExample(codeSampleParams)
      }
    ],
    'x-github': {
      legacy: /-legacy$/.test(endpoint.idName),
      enabledForApps: endpoint.enabledForApps,
      githubCloudOnly: isGitHubCloudOnly(endpoint)
    },
    'x-changes': _.sortBy(changes, 'date')
  }

  if (hasRequestBody(endpoint)) {
    operation.requestBody = {
      content: {
        'application/json': {
          schema: toRequestBodySchema(endpoint)
        }
      }
    }
  }

  const requestBodyParameterName = toRequestBodyParameterName(endpoint)
  if (requestBodyParameterName) {
    operation['x-github'].requestBodyParameterName = requestBodyParameterName
  }

  return operation
}

function toShellExample ({ endpoint, baseUrl }) {
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
    new URL(path, baseUrl).href,
    Object.keys(params).length && `-d '${JSON.stringify(params)}'`
  ].filter(Boolean)
  return `curl \\\n  ${args.join(' \\\n  ')}`
}

function toJsExample ({ operationId, endpoint }) {
  const params = endpoint.params
    .filter(param => !param.deprecated)
    .filter(param => param.required)
    .reduce((params, param) => Object.assign(params, {
      [param.name]: PARAMETER_EXAMPLES[param.name] || param.name
    }), {})

  return `octokit.${operationId}(${Object.keys(params).length ? stringify(params, null, 2) : ''})`
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

function paramsToProperties (params) {
  return params
    .filter(param => !param.name.includes('.'))
    .reduce((properties, param) => {
      const isArrayParam = param.type.includes('[]')
      const addition = {
        description: param.description || `${param.name} parameter`,
        type: param.type,
        enum: param.enum,
        default: param.default
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

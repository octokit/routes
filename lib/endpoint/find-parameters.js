module.exports = findParameters

const _ = require('lodash')

const PAGINATION_VARIABLES = [
  {
    name: 'per_page',
    description: 'Results per page (max 100)',
    in: 'query',
    schema: {
      type: 'integer',
      default: 30
    }
  },
  {
    name: 'page',
    description: 'Page number of the results to fetch.',
    in: 'query',
    schema: {
      type: 'integer',
      default: 1
    }
  }
]

const PARAMETERS_TO_INPUT = require('./overrides/map-parameters-to-input')
const { getOperationId } = require('../openapi')
const normalizeMarkdown = require('../normalize-markdown')

/**
 * Find parameters: most endpoint have either no parameters or a single
 * parameters block, but some have two and more: https://github.com/octokit/routes/issues/4
 */
function findParameters (state) {
  // https://github.com/octokit/routes/issues/332
  if (state.gheVersion <= 2.15) {
    const param = {
      name: 'labels',
      type: 'string',
      required: true,
      description: 'labels parameter',
      location: 'body'
    }
    Object.assign(PARAMETERS_TO_INPUT, {
      'PUT /repos/:owner/:repo/issues/:issue_number/labels': param,
      'POST /repos/:owner/:repo/issues/:issue_number/labels': param
    })
  }
  findInBlocks(state)
  recomposeObjects(state)
  findInRoutePath(state)
  addPaginationParameters(state)
  normalizeDescription(state)
  addRequestBody(state)
  mapToInput(state)

  // check for duplicate names
  // https://github.com/octokit/routes/issues/48
  state.routes.forEach(route => {
    const map = {}
    route.operation.parameters.forEach(param => {
      if (map[param.name]) {
        throw new Error(`Duplicate parameter name: ${param.name} in ${route.operation.summary}`)
      }

      map[param.name] = 1
    })
  })
}

function findInRoutePath (state) {
  state.routes.forEach(route => {
    const matches = route.path.match(/(:\w+)/g)
    const { parameters } = route.operation

    if (!matches) {
      return
    }

    const pathParameters = []
    matches.map(match => match.substr(1)).forEach(name => {
      // Some url variables are listed in parameters, too.
      // related https://github.com/octokit/routes/issues/48
      const existingParam = parameters.find(param => param.name === name)
      if (existingParam) {
        existingParam.required = true
        return
      }

      pathParameters.push({
        name,
        description: `${name} parameter`,
        in: 'path',
        required: true,
        schema: {
          type: getRoutePathParameterType(name)
        }
      })
    })

    parameters.unshift(...pathParameters)
  })
}

function getRoutePathParameterType (name) {
  if (/number$/.test(name)) {
    return 'integer'
  }

  // https://github.com/octokit/routes/issues/266
  if (/^(client_id|gist_id)$/.test(name)) {
    return 'string'
  }

  if (/_id$/.test(name)) {
    return 'integer'
  }

  return 'string'
}

function findInBlocks (state) {
  const parametersBlocks = state.blocks.filter(block => block.type === 'parameters')

  if (parametersBlocks.length === 0) {
    return
  }

  const route = state.routes[0]
  const params = parametersBlocks[0].params.map(formatParam, { ...route, state })

  // remove parameters and heading above from blocks
  state.blocks.splice(state.blocks.indexOf(parametersBlocks[0]) - 1, 2)

  if (parametersBlocks.length === 1) {
    state.routes.forEach(route => {
      route.operation.parameters.push(...params)
    })
    return
  }

  parametersBlocks.slice(1).forEach(parametersBlock => {
    const parametersBlockIndex = state.blocks.indexOf(parametersBlock)
    const prevBlocks = state.blocks.slice(0, parametersBlockIndex).reverse()
    const alternativeHeaderBlock = prevBlocks.find(block => block.type === 'alternativeParametersTitle')
    const optionalHeaderBlock = prevBlocks.find(block => block.type === 'optionalParametersTitle')

    // "Alternative input" => make two endpoints
    if (alternativeHeaderBlock) {
      const route2 = _.cloneDeep(route)
      const params2 = parametersBlock.params.map(formatParam, { ...route2, state })
      route.operation.parameters.push(...params)
      route2.operation.parameters.push(...params2)
      state.routes.push(route2)

      if (prevBlocks[0].type === 'description') {
        const [newSummary] = (prevBlocks[0].textOnly || prevBlocks[0].text)
          .replace(/[^\w]*$/, '')
          .replace(/\n/g, ' ')
          .split(/\.[\s\n]/) // use first sentence as name if there are multiple

        route2.operation.summary = newSummary
          .replace(/^You can also /, '')
          .replace(/\binstead of.*$/i, '') || `${route2.operation.summary} (alternative)`
        route2.operation.operationId = getOperationId(route2)

        if (/\binstead of\b/i.test(newSummary)) {
          const otherParameterNames = prevBlocks[0].text.match(/`([^`]+)`/g).map(name => name.replace(/`/g, ''))
          const alternativeParameterNames = parametersBlock.params.map(p => p.name)

          route2.operation.parameters.push(...params.filter(param => !otherParameterNames.concat(alternativeParameterNames).includes(param.name)))
        }

        // remove parameters block, description & title above
        state.blocks.splice(parametersBlockIndex - 1, 2)
        return
      }

      route2.operation.summary += ' (alternative)'

      // remove parameters block, description & title above
      state.blocks.splice(parametersBlockIndex, 1)

      return
    }

    // "Optional input" => add author & committer as optional parameters, turn table into description
    if (optionalHeaderBlock) {
      const { method, path } = route

      params.push({
        name: 'committer',
        description: 'object containing information about the committer.',
        in: getParameterLocation({
          method,
          path,
          parameter: { name: 'commiter' }
        }),
        schema: {
          type: 'object',
          description: 'object containing information about the committer.',
          properties: {}
        }
      })

      params.push({
        name: 'author',
        description: 'object containing information about the author.',
        in: getParameterLocation({
          method,
          path,
          parameter: { name: 'author' }
        }),
        schema: {
          type: 'object',
          description: 'object containing information about the author.',
          properties: {}
        }
      })
    }

    // "The xyz parameter takes the following keys"
    // extend params with "<param>.<key>" | "<type>" | "<description>"
    // In some cases multiple params need to be extended, see #271
    let prevBlockIndex = parametersBlockIndex - 1
    let prevBlock = state.blocks[prevBlockIndex]
    let descriptionBlock

    // sometimes the sub parameters their own description, e.g.
    // https://developer.github.com/v3/checks/runs/#actions-object
    if (!prevBlock.text.match(/`([^`]+)`/g)) {
      descriptionBlock = prevBlock
      prevBlock = state.blocks[--prevBlockIndex]
    }

    const parameterNames = prevBlock.text
      .match(/`([^`]+)`/g)
      .map(name => name.replace(/`/g, ''))
      .reverse()

    if (descriptionBlock) {
      const parameterName = parameterNames[0]
      const param = params.filter((param) => param.name === parameterName)[0]
      const epilogue = normalizeMarkdown(state, descriptionBlock.text)
      param.description = `${param.description} ${epilogue}`
      if (param.schema && param.schema.description) {
        param.schema.description = `${param.schema.description} ${epilogue}`
      }
    }

    parameterNames.forEach(parameterName => {
      let parentParam

      // workaround for output.annotations.* https://github.com/octokit/routes/issues/140
      if (/^\/repos\/:owner\/:repo\/check-runs/.test(state.routes[0].path) && ['annotations', 'images'].includes(parameterName)) {
        const parameterIndex = _.findIndex(params, (param) => param.name === 'output')
        parentParam = params[parameterIndex].schema.properties[parameterName]
      }

      // workaround for required_pull_request_reviews .dismissal_restrictions.* https://github.com/octokit/routes/issues/97
      if (state.routes[0].path === '/repos/:owner/:repo/branches/:branch/protection' && parameterName === 'dismissal_restrictions') {
        const parameterIndex = _.findIndex(params, (param) => param.name === 'required_pull_request_reviews')
        parentParam = params[parameterIndex].schema.properties.dismissal_restrictions
      }

      if (!parentParam) {
        const parameterIndex = _.findIndex(params, (param) => param.name === parameterName)
        parentParam = params[parameterIndex].schema
      }
      const schema = parentParam.type === 'array'
        ? parentParam.items
        : parentParam
      parametersBlock.params.map(formatParam, { ...route, state }).map(param => {
        schema.properties[param.name] = param.schema
        if (param.required) {
          schema.required = schema.required || []
          schema.required.push(param.name)
        }
      })
    })

    // remove parameters block and description block above
    const blockLength = parametersBlockIndex - prevBlockIndex
    state.blocks.splice(prevBlockIndex, blockLength)

    state.routes.forEach(route => {
      route.operation.parameters = params
    })
  })
}

function recomposeObjects (state) {
  state.routes.forEach(route => {
    const { parameters } = route.operation
    for (let i = 0; i < parameters.length; i++) {
      const param = parameters[i]
      if (param.name.includes('.')) {
        const [parentName, propName] = param.name.split('.')
        const parentParam = parameters.filter(p => p.name === parentName)[0]
        if (parentParam) {
          const { schema } = parentParam
          schema.properties[propName] = param.schema
          if (param.required) {
            schema.required = schema.required || []
            schema.required.push(propName)
          }
          parameters.splice(i, 1)
          i--
        }
      }
    }
  })
}

function addPaginationParameters (state) {
  const hasListHeader = !!state.routes.find(route => /^List\b/.test(route.operation.summary))
  const hasResponseBlock = !!state.blocks.find(block => block.type === 'response')
  const hasResponseWithPaginationHeader = !!state.blocks.find(block => block.hasPaginationHeader)

  if (hasResponseBlock && !hasResponseWithPaginationHeader) {
    return
  }

  if (!hasResponseBlock && !hasListHeader) {
    return
  }

  state.routes.forEach(route => {
    route.operation.parameters.push(...PAGINATION_VARIABLES)
  })
}

function normalizeDescription (state) {
  state.routes.forEach(route => {
    for (let i = 0; i < route.operation.parameters.length; i++) {
      const param = route.operation.parameters[i]
      param.description = normalizeMarkdown(state, param.description)
      if (param.schema && param.schema.description) {
        param.schema.description = normalizeMarkdown(state, param.schema.description)
      }
    }
    return route
  })
  return state
}

function addRequestBody (state) {
  state.routes.forEach(route => {
    const props = {}
    const schema = {
      type: 'object',
      properties: props
    }
    for (let i = 0; i < route.operation.parameters.length; i++) {
      const param = route.operation.parameters[i]
      if (param.in === 'body') {
        props[param.name] = param.schema
        if (param.required) {
          schema.required = schema.required || []
          schema.required.push(param.name)
        }
        route.operation.parameters.splice(i, 1)
        i--
      }
    }
    if (Object.keys(props).length > 0) {
      route.operation.requestBody = {
        content: {
          'application/json': { schema }
        }
      }
    }
    return route
  })
  return state
}

// Add flag for parameters that is expected to be sent as request body root
// see https://github.com/octokit/routes/issues/280
function mapToInput (state) {
  state.routes.forEach(route => {
    const mapKey = `${route.method} ${route.path}`
    const mapToInputParam = PARAMETERS_TO_INPUT[mapKey]

    if (mapToInputParam) {
      route.operation.requestBody = {
        content: {
          'application/json': {
            schema: buildSchema({ ...mapToInputParam })
          }
        }
      }
      route.operation['x-github'].requestBodyParameterName = mapToInputParam.name
    }
  })
}

function formatParam (param) {
  const { method, path, operation, state } = this
  const { name, required, description } = param
  const newDescription = description
    ? normalizeMarkdown(state, description)
    : `${name} parameter`
  const location = getParameterLocation({
    method,
    path,
    parameter: param
  })
  const schemaParam = { ...param, description: newDescription }
  if (location === 'path') {
    delete schemaParam.description
  }
  if (location === 'query') {
    delete schemaParam.description
    delete schemaParam.required
  }
  return {
    name,
    description: newDescription,
    in: location,
    required,
    schema: buildSchema(schemaParam, operation.parameters)
  }
}

function buildSchema (param, params) {
  const { type } = param
  if (type.includes('[]')) { // no support for multidimensional objects
    return buildArraySchema(param, params)
  } else if (type === 'object') {
    return buildObjectSchema(param, params)
  }
  return buildPrimitiveSchema(type, param)
}

function initSchema (type, param) {
  const schema = { type }
  if (param.description) {
    schema.description = param.description
  }
  if (param.enum) {
    schema.enum = param.enum
  }
  if ('default' in param) {
    schema.default = param.default
  }
  if (param.allowNull) {
    schema.nullable = param.allowNull
  }
  return schema
}

function buildPrimitiveSchema (type, param) {
  const schema = initSchema(type, param)
  if (param.regex) {
    schema.pattern = param.regex
  }
  return schema
}

function buildArraySchema (param, params) {
  const schema = initSchema('array', param)
  const itemsParam = {
    name: `${param.name}[]`,
    type: param.type.replace('[]', '') // no support for arrays of arrays
  }
  if (param.regex) {
    itemsParam.regex = param.regex
  }
  schema.items = buildSchema(itemsParam, params)
  return schema
}

function buildObjectSchema (param, params) {
  const schema = initSchema('object', param)
  const prefix = `${param.name}.`
  const childParams = params
    .filter(({ name }) => name.startsWith(prefix))
    .map(p => Object.assign({}, p, { name: p.name.substr(prefix.length) }))
  schema.properties = {}
  const requiredItemNames = childParams
    .filter(param => !param.deprecated || !(param.schema && param.schema.deprecated))
    .filter(param => param.required || (param.schema && param.schema.required))
    .filter(param => param.location === 'body' || param.in === 'body')
    .map(param => param.name)
    .filter(name => !name.includes('.'))
  if (requiredItemNames.length > 0) {
    schema.required = requiredItemNames
  }
  return schema
}

function getParameterLocation ({ method, path, parameter }) {
  const isQueryRequest = ['GET', 'HEAD'].includes(method)
  const urlParameterNames = (path.match(/:\w+/g) || []).map(name => name.substr(1))
  if (urlParameterNames.includes(parameter.name)) {
    return 'path'
  }

  // Only few endpoints define request headers
  // - https://developer.github.com/v3/repos/releases/#upload-a-release-asset (Content-Type, Content-Length)
  // - https://developer.github.com/v3/markdown/#render-a-markdown-document-in-raw-mode (Content-Type)
  if (['Content-Type', 'Content-Length'].includes(parameter.name)) {
    return 'header'
  }

  // Some endpoints have incorrect pagination headers, this is being worked on by GitHub.
  // e.g. if https://developer.github.com/v3/projects/#create-a-repository-project no longer
  // shows Link: <https://api.github.com/resource?page=2>; rel="next", in theresponse,
  // this can be removed
  if (['page', 'per_page'].includes(parameter.name)) {
    return 'query'
  }

  return isQueryRequest ? 'query' : 'body'
}

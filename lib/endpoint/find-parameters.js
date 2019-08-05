module.exports = findParameters

const _ = require('lodash')

const PAGINATION_VARIABLES = [
  {
    name: 'per_page',
    in: 'query',
    schema: {
      type: 'integer',
      default: 30
    },
    required: false,
    description: 'Results per page (max 100)'
  },
  {
    name: 'page',
    in: 'query',
    schema: {
      type: 'integer',
      default: 1
    },
    required: false,
    description: 'Page number of the results to fetch.'
  }
]

const PARAMETERS_TO_INPUT = require('./overrides/map-parameters-to-input')
const normalizeMarkdown = require('../normalize-markdown')

/**
 * Find parameters: most endpoint have either no parameters or a single
 * parameters block, but some have two and more: https://github.com/octokit/routes/issues/4
 */
function findParameters (state) {
  findInBlocks(state)
  findInRoutePath(state)
  addPaginationParameters(state)
  findInputExamples(state)
  normalizeDescription(state)
  addLocation(state)
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
        in: 'path',
        schema: {
          type: getRoutePathParameterType(name)
        },
        required: true,
        description: `${name} parameter`
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

  const params = parametersBlocks[0].params.map(formatParam)

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
      const route2 = _.cloneDeep(state.routes[0])
      state.routes[0].operation.parameters.push(...params)

      route2.operation.parameters.push(...parametersBlock.params)
      state.routes.push(route2)

      if (prevBlocks[0].type === 'description') {
        const [newSummary] = (prevBlocks[0].textOnly || prevBlocks[0].text)
          .replace(/[^\w]*$/, '')
          .replace(/\n/g, ' ')
          .split(/\.[\s\n]/) // use first sentence as name if there are multiple

        route2.operation.summary = newSummary
          .replace(/^You can also /, '')
          .replace(/\binstead of.*$/i, '') || `${route2.operation.summary} (alternative)`

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
      params.push({
        name: 'committer',
        in: 'query',
        schema: { type: 'object' },
        description: 'object containing information about the committer.'
      })

      params.push({
        name: 'author',
        in: 'query',
        schema: { type: 'object' },
        description: 'object containing information about the author.'
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

    parameterNames.forEach(parameterName => {
      // workaround for output.annotations.* https://github.com/octokit/routes/issues/140
      if (/^\/repos\/:owner\/:repo\/check-runs/.test(state.routes[0].path) && ['annotations', 'images'].includes(parameterName)) {
        parameterName = `output.${parameterName}`
      }

      // workaround for required_pull_request_reviews .dismissal_restrictions.* https://github.com/octokit/routes/issues/97
      if (state.routes[0].path === '/repos/:owner/:repo/branches/:branch/protection' && parameterName === 'dismissal_restrictions') {
        parameterName = `required_pull_request_reviews.dismissal_restrictions`
      }

      const parameterIndex = _.findIndex(params, (param) => param.name === parameterName)
      const parameterType = parameterIndex >= 0 ? params[parameterIndex].schema.type : null

      const subParameters = parametersBlock.params.map(formatParam).map(param => {
        const newParam = _.clone(param)
        const parentParameterName = parameterType === 'object[]'
          ? parameterName + '[]'
          : parameterName
        newParam.name = [parentParameterName, param.name].join('.')

        return newParam
      })

      const addSubparametersAt = _.findIndex(params, (param) => param.name === subParameters[0].name.replace(/\.[^.]+$/, '').replace('[]', ''))

      params.splice(addSubparametersAt + 1, 0, ...subParameters)
    })

    // remove parameters block and description block above
    const blockLength = parametersBlockIndex - prevBlockIndex
    state.blocks.splice(prevBlockIndex, blockLength)

    state.routes.forEach(route => {
      if (descriptionBlock) {
        const parameterName = parameterNames[0]
        const param = params.filter((param) => param.name === parameterName)[0]
        param.description = `${param.description} ${descriptionBlock.text}`
      }
      route.operation.parameters = params
    })
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

function findInputExamples (state) {
  const exampleBlocks = state.blocks.filter(block => block.type === 'inputExample')
  const firstExample = exampleBlocks[0]
  state.routes.forEach((route, i) => {
    const example = exampleBlocks[i] || firstExample
    if (example) {
      // TODO: put examples from docs in operation
      // route.operation.parameters[i || XXX].example = example.data
      // route.operation['x-code-samples'].XXX = example.data
    }
  })
}

function normalizeDescription (state) {
  state.routes.forEach(route => {
    for (let i = 0; i < route.operation.parameters.length; i++) {
      const param = route.operation.parameters[i]
      param.description = normalizeMarkdown(state, param.description)
    }
    return route
  })
  return state
}

// parameters can be sent in 4 different locations
// 1. URL (when path contains ":<parameter name>")
// 2. Query parameter (GET or HEAD)
// 3. Request body (not GET or HEAD)
// 4. Header
function addLocation (state) {
  state.routes.forEach(route => {
    const isQueryRequest = ['get', 'head'].includes(route.method)
    const urlParameterNames = (route.path.match(/:\w+/g) || []).map(name => name.substr(1))
    route.operation.parameters.forEach(param => {
      if (urlParameterNames.includes(param.name)) {
        param.in = 'path'
        return
      }

      // Only few endpoints define request headers
      // - https://developer.github.com/v3/repos/releases/#upload-a-release-asset (Content-Type, Content-Length)
      // - https://developer.github.com/v3/markdown/#render-a-markdown-document-in-raw-mode (Content-Type)
      if (['Content-Type', 'Content-Length'].includes(param.name)) {
        param.in = 'header'
        return
      }

      // Some endpoints have incorrect pagination headers, this is being worked on by GitHub.
      // e.g. if https://developer.github.com/v3/projects/#create-a-repository-project no longer
      // shows Link: <https://api.github.com/resource?page=2>; rel="next", in theresponse,
      // this can be removed
      if (['page', 'per_page'].includes(param.name)) {
        param.in = 'query'
        return
      }

      param.in = isQueryRequest ? 'query' : 'body'
    })
  })
}

// Add flag for parameters that is expected to be sent as request body root
// see https://github.com/octokit/routes/issues/280
function mapToInput (state) {
  state.routes.forEach(route => {
    const mapKey = `${route.method} ${route.path}`
    const mapToInputParam = PARAMETERS_TO_INPUT[mapKey]

    if (mapToInputParam) {
      route.operation.parameters.push(mapToInputParam)
      route.operation['x-github'].requestBodyParameterName = mapToInputParam.name
    }
  })
}

function formatParam (rawParam) {
  const param = {
    name: rawParam.name,
    schema: { type: rawParam.type },
    required: rawParam.required,
    description: rawParam.description || `${rawParam.name} parameter`
  }
  if (rawParam.default) {
    param.schema.default = rawParam.default
  }
  if (rawParam.enum) {
    param.schema.enum = rawParam.enum
  }
  if (rawParam.allowNull) {
    param.schema.nullable = rawParam.allowNull
  }
  return param
}

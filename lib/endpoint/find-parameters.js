module.exports = findParameters

const _ = require('lodash')
const markdownTable = require('markdown-table')

const PAGINATION_VARIABLES = [
  {
    name: 'per_page',
    type: 'integer',
    required: false,
    description: 'Results per page (max 100)',
    default: 30,
    location: 'query'
  },
  {
    name: 'page',
    type: 'integer',
    required: false,
    description: 'Page number of the results to fetch.',
    default: 1,
    location: 'query'
  }
]

const PARAMETERS_TO_INPUT = require('./overrides/map-parameters-to-input')

/**
 * Find parameters: most endpoint have either no parameters or a single
 * parameters block, but some have two and more: https://github.com/octokit/routes/issues/4
 */
function findParameters (state) {
  // default to empty array
  state.results.forEach(result => {
    result.params = []
  })

  findInBlocks(state)
  findInRoutePath(state)
  addPaginationParameters(state)
  findInputExamples(state)
  makeRelativeLinksAbsolute(state)
  replaceTimeNowDefault(state)
  addLocation(state)
  mapToInput(state)

  // check for duplicate names
  // https://github.com/octokit/routes/issues/48
  state.results.forEach(result => {
    const map = {}
    result.params.forEach(param => {
      if (map[param.name]) {
        throw new Error(`Parameter conflict name: ${param.name} in ${result.name}`)
      }

      map[param.name] = 1
    })
  })
}

function findInRoutePath (state) {
  state.results.forEach(result => {
    const matches = result.path.match(/(:\w+)/g)

    if (!matches) {
      return
    }

    const routeParameters = []
    matches.map(match => match.substr(1)).forEach(name => {
      // Some url variables are listed in parameters, too.
      // related https://github.com/octokit/routes/issues/48
      const existingParam = result.params.find(param => param.name === name)
      if (existingParam) {
        existingParam.required = true
        return
      }

      routeParameters.push({
        name,
        type: getRoutePathParameterType(name),
        required: true,
        description: ''
      })
    })

    result.params.unshift(...routeParameters)
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

  const params = parametersBlocks[0].params
  // remove paramters and heading above from blocks
  state.blocks.splice(state.blocks.indexOf(parametersBlocks[0]) - 1, 2)

  if (parametersBlocks.length === 1) {
    state.results.forEach(result => {
      result.params.push(...params)
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
      const result2 = _.cloneDeep(state.results[0])
      state.results[0].params.push(...params)

      result2.params.push(...parametersBlock.params)
      state.results.push(result2)

      if (prevBlocks[0].type === 'description') {
        const [newName] = (prevBlocks[0].textOnly || prevBlocks[0].text)
          .replace(/[^\w]*$/, '')
          .replace(/\n/g, ' ')
          .split(/\.[\s\n]/) // use first sentence as name if there are multiple

        result2.name = newName
          .replace(/^You can also /, '')
          .replace(/\binstead of.*$/i, '') || `${result2.name} (alternative)`

        if (/\binstead of\b/i.test(newName)) {
          const otherParameterNames = prevBlocks[0].text.match(/`([^`]+)`/g).map(name => name.replace(/`/g, ''))
          const alternativeParameterNames = parametersBlock.params.map(p => p.name)

          result2.params.push(...params.filter(param => !otherParameterNames.concat(alternativeParameterNames).includes(param.name)))
        }

        // remove parameters block, description & title above
        state.blocks.splice(parametersBlockIndex - 1, 2)
        return
      }

      result2.name += ' (alternative)'

      // remove parameters block, description & title above
      state.blocks.splice(parametersBlockIndex, 1)

      return
    }

    // "Optional input" => add author & committer as optional parameters, turn table into description
    if (optionalHeaderBlock) {
      const optionalHeaderBlockIndex = state.blocks.indexOf(optionalHeaderBlock)
      parametersBlock.type = 'description'

      parametersBlock.text = markdownTable(
        [['name', 'type', 'description']].concat(
          parametersBlock.params.map(param => [param.name, param.type, param.description])
        )
      )

      delete parametersBlock.params

      // remove title and first paragraph from description above parameters table
      state.blocks.splice(optionalHeaderBlockIndex, 2)

      params.push({
        name: 'committer',
        type: 'object',
        description: 'object containing information about the committer.'
      })

      params.push({
        name: 'author',
        type: 'object',
        description: 'object containing information about the author.'
      })

      state.results.forEach(result => {
        result.params.push(...params)
      })
      return
    }

    // "The xyz parameter takes the following keys"
    // extend params with "<param>.<key>" | "<type>" | "<description>"
    // In some cases multiple params need to be extended, see #271
    const prevBlock = state.blocks[parametersBlockIndex - 1]
    const parameterNames = prevBlock.text
      .match(/`([^`]+)`/g)
      .map(name => name.replace(/`/g, ''))
      .reverse()

    parameterNames.forEach(parameterName => {
      // workaround for output.annotations.* https://github.com/octokit/routes/issues/140
      if (/^\/repos\/:owner\/:repo\/check-runs/.test(state.results[0].path) && ['annotations', 'images'].includes(parameterName)) {
        parameterName = `output.${parameterName}`
      }

      // workaround for required_pull_request_reviews .dismissal_restrictions.* https://github.com/octokit/routes/issues/97
      if (state.results[0].path === '/repos/:owner/:repo/branches/:branch/protection' && parameterName === 'dismissal_restrictions') {
        parameterName = `required_pull_request_reviews.dismissal_restrictions`
      }

      const parameterIndex = _.findIndex(params, (param) => param.name === parameterName)
      const parameterType = parameterIndex >= 0 ? params[parameterIndex].type : null

      const subParameters = parametersBlock.params.map(param => {
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
    state.blocks.splice(parametersBlockIndex - 1, 2)

    state.results.forEach(result => {
      result.params = params
    })
  })
}

function addPaginationParameters (state) {
  const hasListHeader = !!state.results.find(result => /^List\b/.test(result.name))
  const hasResponseBlock = !!state.blocks.find(block => block.type === 'response')
  const hasResponseWithPaginationHeader = !!state.blocks.find(block => block.hasPaginationHeader)

  if (hasResponseBlock && !hasResponseWithPaginationHeader) {
    return
  }

  if (!hasResponseBlock && !hasListHeader) {
    return
  }

  state.results.forEach(result => {
    result.params.push(...PAGINATION_VARIABLES)
  })
}

function findInputExamples (state) {
  const exampleBlocks = state.blocks.filter(block => block.type === 'inputExample')
  const firstExample = exampleBlocks[0]
  state.results.forEach((result, i) => {
    const example = exampleBlocks[i] || firstExample
    if (example) {
      result.requests = [example.data]
    }
  })
}

function makeRelativeLinksAbsolute (state) {
  state.results.forEach(output => {
    for (let i = 0; i < output.params.length; i++) {
      output.params[i].description = output.params[i].description.replace(/]\(\/(v3|apps|webhooks)/g, '](https://developer.github.com/$1')
    }
    return output
  })
  return state
}

// fixing Time.now
function replaceTimeNowDefault (state) {
  state.results.forEach(output => {
    output.params.forEach(result => {
      if (result.default === 'Time.now') {
        result.default = '<current date/time>'
      }
    })
  })
}

// parameters can be sent in 4 different locations
// 1. URL (when path contains ":<parameter name>")
// 2. Query parameter (GET or HEAD)
// 3. Request body (not GET or HEAD)
// 4. Header
function addLocation (state) {
  state.results.forEach(endpoint => {
    const isQueryRequest = ['GET', 'HEAD'].includes(endpoint.method)
    const urlParameterNames = (endpoint.path.match(/:\w+/g) || []).map(name => name.substr(1))
    endpoint.params.forEach(result => {
      if (urlParameterNames.includes(result.name)) {
        result.location = 'url'
        return
      }

      // Only few endpoints define request headers
      // - https://developer.github.com/v3/repos/releases/#upload-a-release-asset (Content-Type, Content-Length)
      // - https://developer.github.com/v3/markdown/#render-a-markdown-document-in-raw-mode (Content-Type)
      if (['Content-Type', 'Content-Length'].includes(result.name)) {
        result.location = 'headers'
        return
      }

      // Some endpoints have incorrect pagination headers, this is being worked on by GitHub.
      // e.g. if https://developer.github.com/v3/projects/#create-a-repository-project no longer
      // shows Link: <https://api.github.com/resource?page=2>; rel="next", in theresponse,
      // this can be removed
      if (['page', 'per_page'].includes(result.name)) {
        result.location = 'query'
        return
      }

      result.location = isQueryRequest ? 'query' : 'body'
    })
  })
}

// Add flag for parameters that is expected to be sent as request body root
// see https://github.com/octokit/routes/issues/280
function mapToInput (state) {
  state.results.forEach(endpoint => {
    const route = `${endpoint.method} ${endpoint.path}`
    const mapToInputParam = PARAMETERS_TO_INPUT.common[route]

    if (mapToInputParam) {
      const param = Object.assign({ mapTo: 'input' }, mapToInputParam)
      endpoint.params.push(param)
    }
  })
}

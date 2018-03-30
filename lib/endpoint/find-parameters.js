module.exports = findParameters

const _ = require('lodash')
const markdownTable = require('markdown-table')

const PAGINATION_VARIABLES = [
  {
    name: 'per_page',
    type: 'integer',
    required: false,
    description: 'Results per page (max 100)',
    default: 30
  },
  {
    name: 'page',
    type: 'integer',
    required: false,
    description: 'Page number of the results to fetch.',
    default: 1
  }
]

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

  // check for dublicate names
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
        type: /number$/.test(name) ? 'integer' : 'string',
        required: true,
        description: ''
      })
    })

    result.params.unshift(...routeParameters)
  })
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
    const alternativeHeaderBlock = prevBlocks.find(block => block.type === 'alternativeParametersHeader')
    const optionalHeaderBlock = prevBlocks.find(block => block.type === 'optionalParametersHeader')

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
    const prevBlock = state.blocks[parametersBlockIndex - 1]
    const parameterName = prevBlock.text.match(/`([^`]+)`/).pop()
    const parameterIndex = _.findIndex(params, (param) => param.name === parameterName)

    const subParameters = parametersBlock.params.map(param => {
      param.name = [parameterName, param.name].join('.')
      return param
    })

    params.splice(parameterIndex + 1, 0, ...subParameters)

    // remove parameters block and description block above
    state.blocks.splice(parametersBlockIndex - 1, 2)

    state.results.forEach(result => {
      result.params = params
    })
  })
}

function addPaginationParameters (state) {
  const hasListHeader = !!state.results.find(result => /^List\b/.test(result.name))
  const hasResponseBlock = !!state.blocks.find(block => block.type === 'responseHeader')
  const hasResponseWithPaginationHeader = !!state.blocks.find(block => block.hasPaginationHeader)

  // FIXME: https://developer.github.com/v3/repos/#list-all-topics-for-a-repository
  // FIXME: https://developer.github.com/v3/repos/#list-languages
  // FIXME: https://developer.github.com/v3/repos/pages/#list-latest-pages-build
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

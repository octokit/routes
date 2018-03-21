module.exports = findParameters

const _ = require('lodash')
const markdownTable = require('markdown-table')

const PAGINATION_VARIABLES = [
  {
    name: 'per_page',
    type: 'number',
    required: false,
    description: 'Results per page (max 100)',
    default: 30
  },
  {
    name: 'page',
    type: 'number',
    required: true,
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

  findInRoutePath(state)
  findInBlocks(state)
  addPaginationParameters(state)
}

function findInRoutePath (state) {
  state.results.forEach(result => {
    // @todo https://github.com/octokit/routes/issues/28
    if (!result.path) {
      return
    }

    const matches = result.path.match(/(:\w+)/g)

    if (!matches) {
      return
    }

    matches.map(match => match.substr(1)).forEach(name => {
      result.params.push({
        name,
        type: /number$/.test(name) ? 'number' : 'string',
        required: true,
        description: ''
      })
    })
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
    const prevBlocks = state.blocks.slice(0, parametersBlockIndex - 1).reverse()
    const alternativeHeaderBlock = prevBlocks.find(block => block.type === 'alternativeParametersHeader')
    const optionalHeaderBlock = prevBlocks.find(block => block.type === 'optionalParametersHeader')

    // "Alternative input" => make two endpoints
    if (alternativeHeaderBlock) {
      const result2 = _.clone(state.results[0])
      state.results[0].params.push(...params)
      result2.params.push(...params)
      result2.name += ' (alternative)'
      state.results.push(result2)

      // remove parameters block, description & title above
      state.blocks.splice(parametersBlockIndex - 1, 2)
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
    params.splice(parameterIndex + 1, 0, ...parametersBlock.params.map(param => {
      param.name = [parameterName, param.name].join('.')
      return param
    }))

    // remove parameters block and description block above
    state.blocks.splice(parametersBlockIndex - 1, 2)

    state.results.forEach(result => {
      result.params.push(...params)
    })
  })
}

function addPaginationParameters (state) {
  if (!state.blocks.find(block => block.hasPaginationHeader)) {
    return
  }

  state.results.forEach(result => {
    result.params.push(...PAGINATION_VARIABLES)
  })
}

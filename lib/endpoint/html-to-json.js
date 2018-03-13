module.exports = htmlToJson

const _ = require('lodash')
const cheerio = require('cheerio')
const markdownTable = require('markdown-table')

const elementToBlock = require('./element-to-block')
const htmlContainsEndpoint = require('./html-contains-endpoint')

function htmlToJson (html) {
  if (!htmlContainsEndpoint(html)) {
    return
  }

  const $ = cheerio.load(html)

  const result = {}
  const state = {
    results: [result],
    blocks: $('body > *')
      .map((i, el) => {
        const block = elementToBlock(el)

        if (!block) {
          throw new Error('Could not identify block type for:\n' + cheerio.html(el))
        }

        return block
      })
      .get()
  }

  // first block is always the title block, which
  // also includes the "enabledForApps" flag
  const {text: name, enabledForApps} = state.blocks[0]
  result.name = name
  result.enabledForApps = enabledForApps

  // remove title block so we can keep track of blocks we haven’t parsed yet
  state.blocks.splice(0, 1)

  const routeBlocks = state.blocks.filter(block => block.type === 'route')

  // TODO: Find descriptions and set params for multi-route sections
  if (routeBlocks.length > 1) {
    return routeBlocks.map(({method, path}) => _.merge({
      name,
      method,
      path,
      enabledForApps
    }, result))
  }

  const routeBlock = routeBlocks[0]
  const {method, path} = routeBlock
  result.method = method
  result.path = path

  state.blocks.splice(state.blocks.indexOf(routeBlock), 1)

  // mutate result
  findParameters(state)
  findDescription(state)

  return state.results
}

/**
 * Find parameters: most endpoint have either no parameters or a single
 * parameters block, but some have two and more: https://github.com/gr2m/octokit-rest-routes/issues/4
 */
function findParameters (state) {
  const parametersBlocks = state.blocks.filter(block => block.type === 'parameters')
  if (parametersBlocks.length === 0) {
    state.results.forEach(result => {
      result.params = []
    })
    return
  }

  const params = parametersBlocks[0].params
  // remove paramters and heading above from blocks
  state.blocks.splice(state.blocks.indexOf(parametersBlocks[0]) - 1, 2)

  if (parametersBlocks.length === 1) {
    state.results.forEach(result => {
      result.params = params
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
      state.results[0].params = params
      result2.params = params
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
        result.params = params
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
      result.params = params
    })
  })
}

function findDescription (state) {
  const description = state.blocks
    .filter(block => block.type === 'description')
    .map(block => block.text)
    .join('\n\n')

  state.results.forEach(result => {
    result.description = description
  })
}

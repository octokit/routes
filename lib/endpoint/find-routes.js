module.exports = findRoutes

const _ = require('lodash')

function findRoutes (state) {
  const result = state.results[0]
  const routeBlocks = state.blocks.filter(block => block.type === 'route')

  if (routeBlocks.length === 1) {
    const routeBlock = routeBlocks[0]
    const {method, path} = routeBlock
    result.method = method
    result.path = path
    state.blocks.splice(state.blocks.indexOf(routeBlock), 1)
    return
  }

  const hasAuthenticatedUserRoute = !!routeBlocks.slice(1).find(block => {
    const prevBlock = state.blocks[state.blocks.indexOf(block) - 1]
    return prevBlock.type === 'description' && /^\/user\//.test(block.path)
  })
  const hasExampleRoutes = !!routeBlocks.slice(1).find(block => {
    const prevBlock = state.blocks[state.blocks.indexOf(block) - 1]
    return prevBlock.type === 'description' && /\bexample\b/i.test(prevBlock.text)
  })
  const hasStubbedRoute = !!routeBlocks.slice(1).find(block => {
    const prevBlock = state.blocks[state.blocks.indexOf(block) - 1]

    return /\bstubbed endpoint\b/i.test(prevBlock.text)
  })

  if (hasAuthenticatedUserRoute) {
    state.results = routeBlocks.map((routeBlock) => {
      const routeResult = _.merge({
        method: routeBlock.method,
        path: routeBlock.path,
        enabledForApps: result.enabledForApps
      }, result)

      // <description>, <route block 1>, <description>, <route block 2>
      // e.g. https://developer.github.com/v3/activity/starring/#list-repositories-being-starred
      // => make description the name of the endpoints
      const routeBlockIndex = state.blocks.indexOf(routeBlock)
      const prevBlock = state.blocks[routeBlockIndex - 1]

      routeResult.name = (prevBlock.textOnly || prevBlock.text).replace(/[^\w]*$/, '').replace(/\n/g, ' ')

      state.blocks.splice(routeBlockIndex - 1, 2)

      return routeResult
    })

    return
  }

  if (hasExampleRoutes) {
    routeBlocks.slice(1).forEach(block => {
      block.type = 'description'
      block.text = '```\n' + [block.method, block.path].join(' ') + '\n```'

      delete block.method
      delete block.path
    })
  }

  if (hasStubbedRoute) {
    result.method = routeBlocks[0].method
    result.path = routeBlocks[0].path
    const result2 = _.clone(result)
    result2.name += ' (stubbed)'
    result2.path = routeBlocks[1].path
    state.results.push(result2)

    const routeBlockIndex = state.blocks.indexOf(routeBlocks[1])
    state.blocks.splice(routeBlockIndex - 1, 2)
  }
}

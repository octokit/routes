module.exports = findRoutes

const _ = require('lodash')

function findRoutes (state) {
  const result = state.results[0]
  const routeBlocks = state.blocks.filter(block => block.type === 'route')

  if (routeBlocks.length === 1) {
    const routeBlock = routeBlocks[0]
    const { method, path } = routeBlock
    result.method = method
    result.path = path
    state.blocks.splice(state.blocks.indexOf(routeBlock), 1)
    return
  }

  const hasAuthenticatedUserRoute = !!routeBlocks.slice(1).find(block => {
    const prevBlock = state.blocks[state.blocks.indexOf(block) - 1]
    if (prevBlock.type !== 'description') {
      return false
    }
    // all paths starting with /user/ are routes specific to authenticated user
    if (/^\/user\//.test(block.path)) {
      return true
    }

    if (/the authenticated user's/.test(prevBlock.text)) {
      return true
    }

    return false
  })
  const hasExampleRoutes = !!routeBlocks.slice(1).find(block => {
    const prevBlock = state.blocks[state.blocks.indexOf(block) - 1]

    if (prevBlock.type === 'exampleTitle') {
      return true
    }

    if (prevBlock.type !== 'description') {
      return false
    }

    if (/\bexample\b/i.test(prevBlock.text)) {
      return true
    }

    // https://developer.github.com/v3/scim/#get-a-list-of-provisioned-identities
    if (/^If you want to filter/.test(prevBlock.text)) {
      return true
    }

    return false
  })

  const hasStubbedRoute = !!routeBlocks.slice(1).find(block => {
    const prevBlock = state.blocks[state.blocks.indexOf(block) - 1]

    return /\bstubbed endpoint\b/i.test(prevBlock.text)
  })
  // custom workaround for https://developer.github.com/v3/repos/#create
  const isRepositoryCreate = routeBlocks[0].method === 'POST' && routeBlocks[0].path === '/user/repos'
  if (isRepositoryCreate) {
    // swap first paragraph with note below as we set the paragraph above the
    // route to the name of the new endpoint
    const swap = state.blocks.slice(2, 4)
    state.blocks[2] = swap[1]
    state.blocks[3] = swap[0]
  }

  if (hasAuthenticatedUserRoute || isRepositoryCreate) {
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

      const [newName] = (prevBlock.textOnly || prevBlock.text)
        .replace(/[^\w]*$/, '')
        .replace(/\n/g, ' ')
        .split(/\.[\s\n]/) // use first sentence as name if there are multiple
      routeResult.name = newName

      state.blocks.splice(routeBlockIndex - 1, 2)

      return routeResult
    })

    return
  }

  if (hasExampleRoutes) {
    result.method = routeBlocks[0].method
    result.path = routeBlocks[0].path
    routeBlocks.slice(1).forEach(block => {
      block.type = 'description'
      block.text = '```\n' + [block.method, block.path].join(' ') + '\n```'

      delete block.method
      delete block.path
    })

    return
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

    return
  }

  throw new Error(`Multiple routes could not be handled for: "${result.name}"`)
}

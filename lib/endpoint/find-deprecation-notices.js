module.exports = findDeprecationNotices

function findDeprecationNotices ({ blocks, routes }) {
  const deprecationBlocks = blocks.filter(block => block.type === 'DeprecationTitle')

  if (deprecationBlocks.length === 0) {
    return
  }

  routes.forEach(route => {
    deprecationBlocks.forEach(deprecationBlock => {
      const index = blocks.indexOf(deprecationBlock)
      const infoBlock = blocks[ index + 1 ]
      for (let i = index - 1; i > 0; i--) {
        const block = blocks[i]
        if (block.type === 'response') {
          return deprecateResponse(route, infoBlock)
        }
      }
      return deprecateRoute(route, infoBlock)
    })
  })
}

function deprecateRoute ({ operation, deprecations }, infoBlock) {
  operation.deprecated = true
}

function deprecateResponse ({ operation }, infoBlock) {
  // deprecate response
}

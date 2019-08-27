module.exports = findDeprecationNotices

function findDeprecationNotices ({ blocks, routes }) {
  const deprecationBlocks = blocks.filter(block => block.type === 'DeprecationTitle')

  if (deprecationBlocks.length === 0) {
    return
  }

  routes.forEach(route => {
    deprecationBlocks.forEach(deprecationBlock => {
      const index = blocks.indexOf(deprecationBlock)
      for (let i = index - 1; i > 0; i--) {
        const block = blocks[i]
        if (block.type === 'responseHeaders') {
          return deprecateResponse(route, block.status, blocks.slice(index + 1))
        }
      }
      return deprecateRoute(route)
    })
  })
}

function deprecateRoute ({ operation }) {
  operation.deprecated = true
}

function deprecateResponse ({ operation }, status, deprecationBlocks) {
  let propSchema
  const propPattern = /`([^`]+)` [\w -()]* is deprecated/g
  for (const block of deprecationBlocks) {
    if (block.type === 'description') {
      const propResult = propPattern.exec(block.text)
      if (propResult && propResult[1]) {
        propSchema = operation.responses[status].content['application/json']
          .schema.properties[propResult[1]]
        break
      }
    } else {
      break
    }
  }
  if (propSchema) {
    propSchema.deprecated = true
  }
}

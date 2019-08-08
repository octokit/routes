module.exports = findDeprecationNotices

const CONTEXT_ROUTE = Symbol('CONTEXT_ROUTE')
const CONTEXT_RESPONSE = Symbol('CONTEXT_RESPONSE')
const CONTEXT_DICT = {
  response: CONTEXT_RESPONSE
}
// ^ keyed off of block.type

function findDeprecationNotices (state) {
  const deprecationBlocks = state.blocks
    .filter(block => block.type === 'DeprecationTitle')
    .map(getDeprecationContext)

  state.routes.forEach(route => {
    deprecationBlocks.forEach(deprecationBlock => {
      if (deprecationBlock.context === CONTEXT_ROUTE) {
        // Temporarily deprecation flag because we're
        // not touching the OpenAPI docs in this PR
        // TODO: Re-add deprecation flag
        // route.operation.deprecated = true
      }
      // TODO: handle deprecation notices that are not for the route, e.g.:
      //       The rate object is deprecated in the /rate_limit response
      //       https://developer.github.com/v3/rate_limit/#deprecation-notice
    })
  })

  function getDeprecationContext (deprecationBlock) {
    const index = state.blocks.indexOf(deprecationBlock)
    for (let i = index - 1; i > 0; i--) {
      const block = state.blocks[i]
      const context = CONTEXT_DICT[block.type]
      // ^ Maybe there's a better way?
      //   /Title?/.test(block.type) or similar doesn't feel clean enough
      if (context) {
        return {
          ...deprecationBlock,
          context: context
        }
      }
    }
    return {
      ...deprecationBlock,
      context: CONTEXT_ROUTE
    }
  }
}

module.exports = findResponse

function findResponse (state) {
  // const headers = state.blocks.find(block => block.type === 'responseHeaders')
  const responseBlock = state.blocks.find((block, i, blocks) => {
    if (block.type !== 'response') {
      return
    }

    return ['responseHeaders', 'responseTitle'].includes(blocks[i - 1].type)
  })

  if (!responseBlock) {
    return
  }

  state.results.forEach(result => {
    result.exampleResponse = {
      headers: {
        status: '201 Created',
        'content-type': 'application/json; charset=utf-8'
      },
      body: responseBlock.data
    }
  })
}

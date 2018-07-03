module.exports = findResponse

const http = require('http')

function findResponse (state) {
  // const headers = state.blocks.find(block => block.type === 'responseHeaders')
  let previousBlock
  const responseBlock = state.blocks.find((block, i, blocks) => {
    if (block.type !== 'response') {
      return
    }

    previousBlock = blocks[i - 1]
    if (!previousBlock) {
      return
    }

    return blocks[i - 1] && ['responseHeaders', 'responseTitle'].includes(previousBlock.type)
  })

  if (!responseBlock) {
    return
  }

  const statusCode = previousBlock && 'status' in previousBlock ? previousBlock.status : '200 OK'

  const contentType = 'application/json; charset=utf-8'

  state.results.forEach(result => {
    result.exampleResponse = {
      headers: {
        status: `${statusCode} ${http.STATUS_CODES[statusCode]}`,
        'content-type': contentType
      },
      body: responseBlock.data
    }
  })
}

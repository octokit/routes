module.exports = findResponse

const http = require('http')

function findResponse (state) {
  const responseTitleBlock = state.blocks.find(block => block.type === 'responseTitle')

  if (!responseTitleBlock) {
    return
  }

  let blocksAfterResponseTitle = state.blocks.slice(1 + state.blocks.indexOf(responseTitleBlock))
  const titleAfterResponseTitle = blocksAfterResponseTitle.find(block => /title$/i.test(block.type))

  if (titleAfterResponseTitle) {
    blocksAfterResponseTitle = blocksAfterResponseTitle.slice(0, blocksAfterResponseTitle.indexOf(titleAfterResponseTitle))
  }

  const responses = []

  for (var i = 0; i < blocksAfterResponseTitle.length; i++) {
    const block = blocksAfterResponseTitle[i]
    const nextBlock = blocksAfterResponseTitle[i + 1] || {}

    if (block.type === 'responseHeaders') {
      const statusCode = block.status
      const response = {
        headers: {
          status: `${statusCode} ${http.STATUS_CODES[statusCode]}`,
          'content-type': 'application/json; charset=utf-8'
        }
      }

      if (nextBlock.type === 'response') {
        response.body = nextBlock.data
        i++
      }

      responses.push(response)
      continue
    }

    if (block === 'response') {
      responses.push({
        headers: {
          status: '200 OK',
          'content-type': 'application/json; charset=utf-8'
        },
        body: block.data
      })
    }
  }

  state.results.forEach(result => {
    result.responses = responses
  })
}

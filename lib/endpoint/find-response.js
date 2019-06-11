module.exports = findResponse

const http = require('http')

const normalizeMarkdown = require('../normalize-markdown')

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
    const previousBlock = blocksAfterResponseTitle[i - 1] || {}
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

      if (previousBlock.type === 'description') {
        response.description = normalizeMarkdown(state, previousBlock.text)
      }

      responses.push(response)
      continue
    }

    if (block.type === 'response') {
      const previousBlock = blocksAfterResponseTitle[i - 1] || {}
      const response = {
        headers: {
          status: '200 OK',
          'content-type': 'application/json; charset=utf-8'
        },
        body: block.data
      }
      if (previousBlock.type === 'description') {
        response.description = normalizeMarkdown(state, previousBlock.text)
      }
      responses.push(response)
    }
  }

  state.results.forEach(result => {
    result.responses = responses
  })
}

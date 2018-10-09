module.exports = findResponse

const http = require('http')

const _ = require('lodash')

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
        response.description = previousBlock.text
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
        response.description = previousBlock.text
      }
      responses.push(response)
    }
  }

  // workaround the weird `"fork": true"` in the endpoint responses
  // https://github.com/octokit/routes/issues/279
  if (!/\/forks$/.test(state.results[0].path)) {
    responses.forEach(setForkToFalse)
  }

  state.results.forEach(result => {
    result.responses = responses
  })
}

function setForkToFalse (value) {
  if (_.isObject(value)) {
    Object.keys(value).forEach(key => {
      if (key === 'fork') {
        value.fork = false
      }

      setForkToFalse(value[key])
    })
  }
}

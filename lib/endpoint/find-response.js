module.exports = findResponse

const _ = require('lodash')
const toJsonSchema = require('generate-schema').json

const normalizeMarkdown = require('../normalize-markdown')

function findResponse (state) {
  const responseTitleBlock = state.blocks.find(block => block.type === 'responseTitle')

  const responses = {}

  if (!responseTitleBlock) {
    assignResponseProperties(responses, 418)
    updateRoutes(state.routes, responses)
    return
  }

  let blocksAfterResponseTitle = state.blocks.slice(1 + state.blocks.indexOf(responseTitleBlock))
  const titleAfterResponseTitle = blocksAfterResponseTitle.find(block => /title$/i.test(block.type))

  if (titleAfterResponseTitle) {
    blocksAfterResponseTitle = blocksAfterResponseTitle.slice(0, blocksAfterResponseTitle.indexOf(titleAfterResponseTitle))
  }

  for (var i = 0; i < blocksAfterResponseTitle.length; i++) {
    const previousBlock = blocksAfterResponseTitle[i - 1] || {}
    const block = blocksAfterResponseTitle[i]
    const nextBlock = blocksAfterResponseTitle[i + 1] || {}

    let description = null
    let body = null

    if (block.type === 'responseHeaders') {
      const statusCode = block.status

      if (nextBlock.type === 'response') {
        // temporary workaround for invalid response at https://developer.github.com/v3/teams/team_sync/#response-2
        if (state.routes[0].operation.summary === 'Create or update IdP group connections') {
          nextBlock.data = {
            groups: nextBlock.data.groups[0]
          }
        }

        body = nextBlock.data
        i++
      }

      if (previousBlock.type === 'description') {
        description = normalizeMarkdown(state, previousBlock.text)
      }

      !responses[statusCode] && assignResponseProperties(
        responses,
        statusCode,
        description,
        body
      )
      continue
    }

    if (block.type === 'response') {
      const previousBlock = blocksAfterResponseTitle[i - 1] || {}
      if (previousBlock.type === 'description') {
        description = normalizeMarkdown(state, previousBlock.text)
      }
      assignResponseProperties(
        responses,
        200,
        description,
        block.data
      )
    }
  }

  if (Object.keys(responses).length === 0) {
    assignResponseProperties(responses, 418)
  }
  updateRoutes(state.routes, responses)
}

function updateRoutes (routes, responses) {
  routes.forEach(route => {
    route.operation.responses = responses
  })
}

function assignResponseProperties (responses, code, description, body) {
  const intCode = parseInt(code || 418, 10)
  const response = responses[intCode] = {}
  if (intCode === 418) {
    response.description = description || 'Response definition missing'
    return
  }
  if (intCode === 204) {
    response.description = description || 'Empty response'
    return
  }
  response.description = description || 'response'
  if (body) {
    response.content = {
      'application/json': {
        schema: buildSchema(body)
      }
    }
  }

  function buildSchema (body) {
    if (Array.isArray(body) && body[0] && typeof body[0] === 'object') {
      return {
        type: 'array',
        items: buildSchema(body[0])
      }
    }
    // WORKAROUND: speccy does not like {"type": null}
    const schema = mapValuesDeep(
      toJsonSchema(body),
      value => value === 'null' ? 'string' : value
    )
    delete schema.$schema
    return schema
  }

  function mapValuesDeep (v, callback) {
    if (_.isArray(v)) {
      return v.map(innerObj => mapValuesDeep(innerObj, callback))
    }

    return _.isObject(v)
      ? _.mapValues(v, v => mapValuesDeep(v, callback))
      : callback(v)
  }
}

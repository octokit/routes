module.exports = findExamples

const { mapValues, kebabCase } = require('lodash')

const normalizeMarkdown = require('../normalize-markdown')
const { assignResponse } = require('../openapi')

function findExamples (state) {
  const exampleBlocks = state.blocks.filter(block => block.type === 'inputExample')
  const responseBlocks = state.blocks.filter(block => block.type === 'response')
  if (exampleBlocks.length === 0 && responseBlocks.length === 0) {
    return
  }
  const hasMultipleExamples = exampleBlocks.length > 1 && state.routes.length !== exampleBlocks.length
  const responses = responseBlocks.map(buildResponse, { state })
  const examples = exampleBlocks.map(
    buildExample,
    { state, hasMultipleExamples, responses }
  )
  state.routes.forEach((route, routeIndex) => {
    const routeExamples = hasMultipleExamples
      ? examples
      : examples.length
        ? [examples[routeIndex] || examples[0]]
        : []
    for (let i = 0, n = routeExamples.length - 1; i <= n; i++) {
      const example = routeExamples[i]
      for (const paramName of Object.keys(example.request.params)) {
        const exampleValue = example.request.params[paramName]
        let param = route.operation.parameters.find(param => param.name === paramName)
        if (param) {
          addParamExample(example, param, paramName, exampleValue)
        } else {
          try {
            param = route.operation.requestBody.content['application/json']
              .schema.properties[paramName]
          } catch (noRequestBodyParam) {}
          if (param) {
            const jsonContent = route.operation.requestBody.content['application/json']
            addBodyParamExample(example, jsonContent, paramName, exampleValue)
          } else {
            // Examples with non-existent params do occur (as of 15 aug 2019):
            //   https://developer.github.com/v3/issues/#lock-an-issue
            //     `locked' and `active_lock_reason` are in the example, but only `lock_reason` is in the parameters
            //   https://developer.github.com/v3/orgs/#edit-an-organization
            //     `blog` is included in example, but is not a param
            //   Import docs are oddly structured and have complex partial *response* examples
            //     https://developer.github.com/v3/migrations/source_imports/#get-import-progress
            //     https://developer.github.com/v3/migrations/source_imports/#update-existing-import
            //   SCIM docs are not structured in a genericly parseable way
            //     https://developer.github.com/v3/scim/#provision-and-invite-users
            //     https://developer.github.com/v3/scim/#replace-a-provisioned-users-information
            //     https://developer.github.com/v3/scim/#update-a-user-attribute
            //       No param blocks, but some params are partially described in
            //       different types of blocks above the example block
            //   Unlabeled/unexplained examples for single params, can be easy for humans, but not genericly parseable
            //     https://developer.github.com/v3/repos/branches/#replace-required-status-checks-contexts-of-protected-branch
            //     https://developer.github.com/v3/repos/branches/#*-required-status-checks-contexts-of-protected-branch
            //     https://developer.github.com/v3/repos/branches/#replace-team-restrictions-of-protected-branch
            //     https://developer.github.com/v3/repos/branches/#*-team-restrictions-of-protected-branch
            //     https://developer.github.com/v3/repos/branches/#*-user-restrictions-of-protected-branch
            // ^ There are potential improvements/workarounds to accommodate these misses
          }
        }
      }
      example.response && addResponseExample(
        example.key,
        example.title || example.response.title,
        example.response,
        route.operation.responses
      )
    }
    const responseSignatures = responses.reduce((sigs, response) => {
      const { status, mediaType, title } = response
      const key = [status, mediaType, title].join(':')
      sigs[key] = sigs[key] || { index: 0, count: 0 }
      sigs[key].count++
      return sigs
    }, {})
    responses.forEach((response) => {
      const { status, mediaType, key, title } = response
      const sigKey = [status, mediaType, title].join(':')
      responseSignatures[sigKey].index++
      const { index, count } = responseSignatures[sigKey]
      let responseKey = key
      let responseTitle = title
      if (count > 1 || (responses.length > 1 && !title)) {
        if (!title) {
          responseTitle = count > 1
            ? `Response ${index}`
            : 'Default response'
          responseKey = kebabCase(responseTitle)
        }
      }
      addResponseExample(
        responseKey,
        responseTitle,
        response,
        route.operation.responses
      )
    })
    cleanupResponses(route.operation.responses)
  })
}

function buildResponse (responseBlock, i, responseBlocks) {
  const { state } = this
  const responseBlockIndex = state.blocks.indexOf(responseBlock)
  const potentialResponseBlocks = state.blocks
    .slice(0, responseBlockIndex)
    .reverse()
  const blocks = { responses: responseBlocks, response: responseBlock }
  for (const block of potentialResponseBlocks) {
    if ([
      'responseTitle',
      'alternativeResponseTitle'
    ].includes(block.type)) {
      blocks.title = block
      break
    } else if (block.type === 'responseHeaders') {
      // If the header's already been set, it's become a new response
      if (blocks.header) {
        break
      }
      blocks.header = block
    } else if (['example', 'description'].includes(block.type)) {
      blocks.descriptions = blocks.descriptions || []
      blocks.descriptions.unshift(block)
    } else if (block.type === 'mediaType') {
      blocks.mediaType = block
    } else if (block.type === 'preview') {
      blocks.preview = block
    } else if (block.type === 'exampleTitle') {
      break
    } else {
      // ignore previewWarning
    }
  }
  return formatResponse(state, blocks)
}

function formatResponse (state, blocks) {
  const {
    header,
    preview,
    mediaType,
    title,
    descriptions
  } = blocks
  const responseBlock = blocks.response
  // No headers means 200? Or should it be 418? It only happens 3x on api.gh
  //   https://developer.github.com/v3/repos/branches/#list-team-restrictions-of-protected-branch
  //   https://developer.github.com/v3/repos/commits/#compare-two-commits
  //   https://developer.github.com/v3/users/#get-contextual-information-about-a-user
  const response = {
    status: header ? header.status : 200,
    mediaType: preview
      ? preview.acceptHeader
      : mediaType
        ? mediaType.acceptHeader
        : 'application/json'
  }
  if (title && title.text && ![
    'response',
    'successful response'
  ].includes(title.text.toLowerCase().trim())) {
    response.key = kebabCase(title.text)
    response.title = title.text
  }
  if (descriptions && descriptions.length > 0) {
    response.description = descriptions
      .map(({ type, text }) => type === 'example'
        ? `\n\`\`\`\n${text}\n\`\`\`\n`
        : normalizeMarkdown(state, text)
      )
      .join('\n')
  }
  response.example = responseBlock.data
  return response
}

function buildExample (inputBlock, i, exampleBlocks) {
  const { state, hasMultipleExamples, responses } = this
  const inputBlockIndex = state.blocks.indexOf(inputBlock)
  const potentialResponseBlocks = state.blocks.slice(inputBlockIndex + 1, inputBlockIndex + 6)
  const blocks = { examples: exampleBlocks, input: inputBlock }
  let response
  for (const block of potentialResponseBlocks) {
    if ([
      'responseTitle',
      'alternativeResponseTitle',
      'responseHeaders'
    ].includes(block.type)) {
      // do nothing
    } else if (block.type === 'description') {
      blocks.descriptions = blocks.descriptions || []
      blocks.descriptions.push(block)
    } else if (block.type === 'response') {
      response = responses.find(({ example }) => example === block.data)
      const responseIndex = responses.indexOf(response)
      responses.splice(responseIndex, 1)
      break
    } else if ([
      'exampleTitle',
      'alternativeParametersTitle',
      'inputExample'
    ].includes(block.type)) {
      // Break if running into next example
      break
    }
  }
  return formatExample(blocks, response, hasMultipleExamples)
}

function formatExample (blocks, response, isForEachRoute) {
  const { examples, input, description } = blocks
  const example = {}
  const title = getTitle(input, examples, isForEachRoute)
  if (title) {
    example.key = kebabCase(title)
    example.title = title
  }
  example.request = {
    params: input.data
  }
  if (description) {
    example.request.description = description.text
  }
  if (response) {
    example.response = response
  }
  return example
}

function getTitle (input, examples, isForEachRoute) {
  if (isForEachRoute) {
    const titleDupes = examples.filter(({ title }) => title === input.title)
    if (titleDupes.length > 1) {
      const index = titleDupes.indexOf(input)
      return `${input.title} ${index + 1}`
    }
    return input.title
  }
  return null
}

function addParamExample (example, param, paramName, paramValue) {
  if (example.key) {
    const { key, title } = example
    param.examples = param.examples || {}
    param.examples[key] = param.examples[key] || getExampleObject({}, title)
    param.examples[key].value[paramName] = paramValue
  } else {
    param.example = paramValue
  }
}

function addBodyParamExample (example, jsonContent, paramName, paramValue) {
  if (example.key) {
    const { key, title } = example
    jsonContent.examples = jsonContent.examples || {}
    jsonContent.examples[key] = jsonContent.examples[key] || getExampleObject({}, title)
    jsonContent.examples[key].value[paramName] = paramValue
  } else {
    jsonContent.example = jsonContent.example || {}
    jsonContent.example[paramName] = paramValue
  }
}

function addResponseExample (key, title, response, responses) {
  const { status, mediaType, example } = response
  let responseContent
  try {
    responseContent = responses[status].content[mediaType]
  } catch (noResponseSchema) {
    delete responses[418]
    assignResponse(responses, status, title, example, mediaType)
    responseContent = responses[status].content[mediaType]
  }
  if (!responseContent) {
    assignResponse(responses, status, title, example, mediaType)
    responseContent = responses[status].content[mediaType]
  }
  if (key || responseContent.examples) {
    responseContent.examples = responseContent.examples || {}
    const responseTitle = title && response.title && title !== 'response' && title.toLowerCase() !== response.title.toLowerCase()
      ? `${title}: ${response.title}`
      : response.title || title || 'Response'
    responseContent.examples[key || kebabCase(responseTitle)] = {
      summary: responseTitle,
      value: example
    }
  } else {
    responseContent.example = example
  }
}

function getExampleObject (value, summary, description) {
  const example = {}
  if (summary) {
    example.summary = summary
  }
  if (description) {
    example.description = normalizeMarkdown(description)
  }
  example.value = value
  return example
}

function cleanupResponses (responses) {
  mapValues(responses, (response) => {
    if (!response.content) {
      return response
    }
    if (Object.keys(response.content).length > 1) {
      // Too many responses for parsed description to be accurate:
      response.description = 'response'
      return response
    }
    let examples
    try {
      examples = response.content['application/json'].examples
    } catch (noNamedExamples) {
      return response
    }
    if (!examples) {
      return response
    }
    const keys = Object.keys(examples)
    if (keys.length > 1) {
      // Too many responses for description to be accurate:
      response.description = 'response'
    } else {
      delete examples[keys[0]].summary // description is summary
    }
    return response
  })
}

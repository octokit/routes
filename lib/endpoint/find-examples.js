module.exports = findExamples

const { kebabCase } = require('lodash')

const normalizeMarkdown = require('../normalize-markdown')
const { assignResponse } = require('../openapi')

function findExamples (state) {
  const exampleBlocks = state.blocks.filter(block => block.type === 'inputExample')
  if (exampleBlocks.length === 0) {
    return
  }
  const hasMultipleExamples = exampleBlocks.length > 1 && state.routes.length !== exampleBlocks.length
  const examples = exampleBlocks.map((inputBlock) => {
    const inputBlockIndex = state.blocks.indexOf(inputBlock)
    const potentialResponseBlocks = state.blocks.slice(inputBlockIndex + 1, inputBlockIndex + 6)
    const blocks = { examples: exampleBlocks, input: inputBlock }
    for (const block of potentialResponseBlocks) {
      if ([
        'responseTitle',
        'alternativeResponseTitle'
      ].includes(block.type)) {
        blocks.responseTitle = block
      } else if (block.type === 'responseHeaders') {
        blocks.responseHeader = block
      } else if (block.type === 'response') {
        blocks.response = block
        break
      } else if (block.type === 'description') {
        if (blocks.responseTitle || blocks.responseHeader || blocks.response) {
          blocks.responseDescription = block
        } else {
          blocks.inputDescription = block
        }
      } else if (block.type === 'inputExample') {
        break
      }
    }
    return buildExample(blocks, hasMultipleExamples)
  })
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
        example,
        route.operation.responses
      )
    }
  })
}

function buildExample (blocks, isForEachRoute) {
  const {
    examples,
    input,
    inputDescription,
    response,
    responseHeader,
    responseTitle,
    responseDescription
  } = blocks
  const example = {}
  const title = getTitle(input, examples, isForEachRoute)
  if (title) {
    example.key = kebabCase(title)
    example.title = title
  }
  example.request = {
    params: input.data
  }
  if (inputDescription) {
    example.request.description = inputDescription.text
  }
  if (response && responseHeader) {
    example.response = {
      status: responseHeader.status,
      content: response.data
    }
    if (responseTitle && ![
      'response',
      'successful response'
    ].includes(responseTitle.text.toLowerCase().trim())) {
      example.response.title = responseTitle.text
    }
    if (responseDescription) {
      example.response.description = responseDescription.text
    }
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

function addResponseExample (example, responses) {
  const { status, title, content } = example.response
  let responseContent
  try {
    responseContent = responses[status].content['application/json']
  } catch (noResponseSchema) {
    delete responses[418]
    assignResponse(responses, status, title, content)
    responseContent = responses[status].content['application/json']
  }
  if (example.key) {
    responseContent.examples = responseContent.examples || {}
    responseContent.examples[example.key] = {
      summary: example.title,
      value: content
    }
  } else {
    responseContent.example = content
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

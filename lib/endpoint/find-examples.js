module.exports = findExamples

const { kebabCase } = require('lodash')

const normalizeMarkdown = require('../normalize-markdown')

function findExamples (state) {
  const exampleBlocks = state.blocks.filter(block => block.type === 'inputExample')
  const hasMultipleExamples = exampleBlocks.length > 1 && state.routes.length !== exampleBlocks.length
  const exampleTitles = []
  if (hasMultipleExamples) {
    for (const { title } of exampleBlocks) {
      const duplicateCount = exampleTitles.filter(exTitle => exTitle === title).length
      exampleTitles.push(duplicateCount
        ? `${title} ${duplicateCount + 1}`
        : title
      )
    }
  }
  state.routes.forEach((route, routeIndex) => {
    const routeExampleBlocks = hasMultipleExamples
      ? exampleBlocks
      : exampleBlocks.length
        ? [exampleBlocks[routeIndex] || exampleBlocks[0]]
        : []
    for (let i = 0, n = routeExampleBlocks.length - 1; i <= n; i++) {
      const block = routeExampleBlocks[i]
      const exampleTitle = exampleTitles[i]
      for (const paramName of Object.keys(block.data)) {
        const exampleValue = block.data[paramName]
        let param = route.operation.parameters.find(param => param.name === paramName)
        if (param) {
          addParamExample(param, paramName, exampleValue, exampleTitle)
        } else {
          try {
            param = route.operation.requestBody.content['application/json']
              .schema.properties[paramName]
          } catch (noRequestBodyParam) {}
          if (param) {
            const jsonContent = route.operation.requestBody.content['application/json']
            addBodyParamExample(jsonContent, paramName, exampleValue, exampleTitle)
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
    }
  })
}

function addParamExample (param, paramName, exampleValue, exampleTitle) {
  if (exampleTitle) {
    const key = kebabCase(exampleTitle)
    param.examples = param.examples || {}
    param.examples[key] = param.examples[key] || getExampleObject({}, exampleTitle)
    param.examples[key].value[paramName] = exampleValue
  } else {
    param.example = exampleValue
  }
}

function addBodyParamExample (jsonContent, paramName, exampleValue, exampleTitle) {
  if (exampleTitle) {
    const key = kebabCase(exampleTitle)
    jsonContent.examples = jsonContent.examples || {}
    jsonContent.examples[key] = jsonContent.examples[key] || getExampleObject({}, exampleTitle)
    jsonContent.examples[key].value[paramName] = exampleValue
  } else {
    jsonContent.example = jsonContent.example || {}
    jsonContent.example[paramName] = exampleValue
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

module.exports = addCodeSamples

const { get: getLeaf } = require('lodash')
const urlTemplate = require('url-template')
const { stringify } = require('javascript-stringify')

// TODO: find a better place to define parameter examples
const PARAMETER_EXAMPLES = {
  owner: 'octocat',
  repo: 'hello-world',
  issue_number: 1,
  title: 'title'
}

function addCodeSamples ({ routes, scope, baseUrl }) {
  routes.forEach(route => {
    const codeSampleParams = { route, scope, baseUrl }
    route.operation['x-code-samples'] = route.operation['x-code-samples'].concat(
      { lang: 'Shell', source: toShellExample(codeSampleParams) },
      { lang: 'JS', source: toJsExample(codeSampleParams) }
    )
  })
}

function toShellExample ({ route, scope, baseUrl }) {
  const path = urlTemplate.parse(route.path.replace(/:(\w+)/, '{$1}')).expand(PARAMETER_EXAMPLES)
  const params = {}
  Object.assign(params, getRequiredBodyParamDict(route.operation))

  const method = route.method.toUpperCase()
  const defaultAcceptHeader = route.operation.parameters[0].schema.default

  const args = [
    method !== 'GET' && `-X${method}`,
    `-H"Accept: ${defaultAcceptHeader}"`,
    new URL(path, baseUrl).href,
    Object.keys(params).length && `-d '${JSON.stringify(params)}'`
  ].filter(Boolean)
  return `curl \\\n  ${args.join(' \\\n  ')}`
}

function toJsExample ({ route, scope, baseUrl }) {
  const params = route.operation.parameters
    .filter(param => !param.deprecated)
    .filter(param => param.in !== 'header')
    .filter(param => param.required)
    .reduce((params, param) => Object.assign(params, {
      [param.name]: PARAMETER_EXAMPLES[param.name] || param.name
    }), {})
  Object.assign(params, getRequiredBodyParamDict(route.operation))

  return `octokit.${scope}.get(${Object.keys(params).length ? stringify(params, null, 2) : ''})`
}

function getRequiredBodyParamDict (operation) {
  const requiredBodyParamDict = {}
  const requiredBodyParams = [].concat(getLeaf(
    operation,
    'requestBody.content[application/json].schema.required'
  ) || [])
  // Temporary workarounds for PR#482:
  const { prepareParams, prepareParamDict } = getParamAlterers(operation.operationId)
  prepareParams && prepareParams(requiredBodyParams)
  requiredBodyParams.length > 0 && Object.assign(
    requiredBodyParamDict,
    requiredBodyParams.reduce(reduceToParamDict, {})
  )
  prepareParamDict && prepareParamDict(requiredBodyParamDict)
  return requiredBodyParamDict

  function reduceToParamDict (paramDict, paramName) {
    const paramSchema = operation.requestBody.content['application/json']
      .schema.properties[paramName]
    if (!paramSchema.deprecated) {
      paramDict[paramName] = PARAMETER_EXAMPLES[paramName] || paramName

      // Temporarily add object props as separate string values because we're
      // not touching the OpenAPI docs in this PR
      // TODO: Make code samples respect parameter types and really just be less weird
      let props, prefix
      if (paramSchema.type === 'object') {
        props = paramSchema.properties
        prefix = paramName
      } else if (paramSchema.type === 'array' && paramSchema.items.type === 'object') {
        props = paramSchema.items.properties
        prefix = `${paramName}[]`
      }
      if (props && prefix) {
        for (const propName of Object.keys(props)) {
          const fauxPropName = `${prefix}.${propName}`
          paramDict[fauxPropName] = fauxPropName
        }
      }
    }
    return paramDict
  }
}

function getParamAlterers (operationId) {
  switch (operationId) {
    case 'pulls-create-review':
      return {
        prepareParams: (params) => params.push('comments'),
        prepareParamDict: (paramDict) => {
          delete paramDict.comments
        }
      }
    case 'repos-create-hook':
      return {
        prepareParamDict: (paramDict) => {
          delete paramDict['config.content_type']
          delete paramDict['config.secret']
          delete paramDict['config.insecure_ssl']
        }
      }
    case 'git-create-tree':
      return {
        prepareParamDict: (paramDict) => {
          delete paramDict['tree[].path']
          delete paramDict['tree[].mode']
          delete paramDict['tree[].type']
          delete paramDict['tree[].sha']
          delete paramDict['tree[].content']
        }
      }
    case 'repos-update-hook':
      return {
        prepareParams: (params) => params.push('config'),
        prepareParamDict: (paramDict) => {
          delete paramDict.config
          delete paramDict['config.content_type']
          delete paramDict['config.secret']
          delete paramDict['config.insecure_ssl']
        }
      }
  }
  return {}
}

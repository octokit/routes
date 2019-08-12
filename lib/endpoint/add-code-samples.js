module.exports = addCodeSamples

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
  let schema
  try {
    schema = operation.requestBody.content['application/json'].schema
  } catch (noResponseBody) {
    return {}
  }
  if (schema.type === 'string') {
    const paramName = operation['x-github'].requestBodyParameterName
    return { [paramName]: PARAMETER_EXAMPLES[paramName] || paramName }
  }
  const requiredBodyParamDict = {}
  const requiredBodyParams = [].concat(schema.required || [])
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
    case 'checks-create':
      return {
        prepareParamDict: (paramDict) => {
          Object.assign(paramDict, {
            'output.title': 'output.title',
            'output.summary': 'output.summary',
            'output.annotations[].path': 'output.annotations[].path',
            'output.annotations[].start_line': 'output.annotations[].start_line',
            'output.annotations[].end_line': 'output.annotations[].end_line',
            'output.annotations[].annotation_level': 'output.annotations[].annotation_level',
            'output.annotations[].message': 'output.annotations[].message',
            'output.images[].alt': 'output.images[].alt',
            'output.images[].image_url': 'output.images[].image_url',
            'actions[].label': 'actions[].label',
            'actions[].description': 'actions[].description',
            'actions[].identifier': 'actions[].identifier'
          })
        }
      }
    case 'checks-update':
      return {
        prepareParamDict: (paramDict) => {
          Object.assign(paramDict, {
            'output.summary': 'output.summary',
            'output.annotations[].path': 'output.annotations[].path',
            'output.annotations[].start_line': 'output.annotations[].start_line',
            'output.annotations[].end_line': 'output.annotations[].end_line',
            'output.annotations[].annotation_level': 'output.annotations[].annotation_level',
            'output.annotations[].message': 'output.annotations[].message',
            'output.images[].alt': 'output.images[].alt',
            'output.images[].image_url': 'output.images[].image_url',
            'actions[].label': 'actions[].label',
            'actions[].description': 'actions[].description',
            'actions[].identifier': 'actions[].identifier'
          })
        }
      }
    case 'checks-set-suites-preferences':
      return {
        prepareParams: (params) => params.push('auto_trigger_checks'),
        prepareParamDict: (paramDict) => {
          delete paramDict.auto_trigger_checks
        }
      }
    case 'gists-create':
      return {
        prepareParamDict: (paramDict) => {
          delete paramDict['files.content']
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
    case 'pulls-create-review':
      return {
        prepareParams: (params) => params.push('comments'),
        prepareParamDict: (paramDict) => {
          delete paramDict.comments
        }
      }
    case 'repos-create-or-update-file':
      return {
        prepareParams: (params) => params.push('committer', 'author'),
        prepareParamDict: (paramDict) => {
          delete paramDict.committer
          delete paramDict.author
        }
      }
    case 'repos-update-branch-protection':
      return {
        prepareParamDict: (paramDict) => {
          delete paramDict['required_pull_request_reviews.dismissal_restrictions']
          delete paramDict['required_pull_request_reviews.dismiss_stale_reviews']
          delete paramDict['required_pull_request_reviews.require_code_owner_reviews']
          delete paramDict['required_pull_request_reviews.required_approving_review_count']
          delete paramDict['restrictions.users']
          delete paramDict['restrictions.teams']
        }
      }
    case 'orgs-create-hook':
    case 'repos-create-hook':
      return {
        prepareParamDict: (paramDict) => {
          delete paramDict['config.content_type']
          delete paramDict['config.secret']
          delete paramDict['config.insecure_ssl']
        }
      }
    case 'orgs-update-hook':
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
    case 'repos-add-protected-branch-required-status-checks-contexts':
    case 'repos-remove-protected-branch-required-status-checks-contexts':
    case 'repos-replace-protected-branch-required-status-checks-contexts':
      return {
        prepareParamDict: (paramDict) => {
          Object.assign(paramDict, {
            contexts: 'contexts'
          })
        }
      }
    case 'repos-add-protected-branch-team-restrictions':
    case 'repos-remove-protected-branch-team-restrictions':
    case 'repos-replace-protected-branch-team-restrictions':
      return {
        prepareParamDict: (paramDict) => {
          Object.assign(paramDict, {
            teams: 'teams'
          })
        }
      }
    case 'repos-add-protected-branch-user-restrictions':
    case 'repos-remove-protected-branch-user-restrictions':
    case 'repos-replace-protected-branch-user-restrictions':
      return {
        prepareParamDict: (paramDict) => {
          Object.assign(paramDict, {
            users: 'users'
          })
        }
      }
    case 'markdown-render-raw':
      return {
        prepareParamDict: (paramDict) => {
          Object.assign(paramDict, {
            data: 'data'
          })
        }
      }
    case 'enterprise-admin-create-global-hook':
      return {
        prepareParamDict: (paramDict) => {
          delete paramDict['config.content_type']
          delete paramDict['config.secret']
          delete paramDict['config.insecure_ssl']
        }
      }
    case 'enterprise-admin-update-global-hook':
      return {
        prepareParamDict: (paramDict) => {
          Object.assign(paramDict, {
            'config.url': 'config.url'
          })
        }
      }
  }
  return {}
}

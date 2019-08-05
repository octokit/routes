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

function addCodeSamples (state) {
  const { scope, baseUrl } = state

  state.routes.forEach(route => {
    const codeSampleParams = { route, scope, baseUrl }
    route.operation['x-code-samples'] = route.operation['x-code-samples'].concat(
      { lang: 'Shell', source: toShellExample(codeSampleParams) },
      { lang: 'JS', source: toJsExample(codeSampleParams) }
    )
  })
}

function toShellExample ({ route, scope, baseUrl }) {
  const path = urlTemplate.parse(route.path.replace(/:(\w+)/, '{$1}')).expand(PARAMETER_EXAMPLES)
  const params = route.operation.parameters
    .filter(param => !param.deprecated)
    .filter(param => param.location === 'body')
    .filter(param => param.required)
    .reduce((params, param) => Object.assign(params, {
      [param.name]: PARAMETER_EXAMPLES[param.name] || param.name
    }), {})

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

  return `octokit.${scope}.get(${Object.keys(params).length ? stringify(params, null, 2) : ''})`
}

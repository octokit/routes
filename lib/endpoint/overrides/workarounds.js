module.exports = workarounds

function workarounds (state) {
  state.routes.forEach(route => {
    const { operation } = route

    // There are few cases when a whole page describes a single endpoint.
    // The titles on these pages don’t map well to method names, hence the overide
    // See https://github.com/octokit/routes/issues/50
    if (['Emojis', 'Meta'].includes(operation.summary)) {
      operation.summary = 'Get'
    }

    // https://github.com/octokit/routes/issues/287
    if (operation.summary === 'Create a comment (alternative)') {
      operation.summary = 'Create a comment reply'
    }
    if (operation.summary === 'create a Pull Request from an existing Issue by passing an Issue number ') {
      operation.summary = 'Create a Pull Request from an Issue'
    }

    // remove once `id` no longer listed in parameter table for
    // 1. https://developer.github.com/v3/repos/deployments/#get-a-single-deployment-status
    // 2. https://developer.github.com/v3/repos/deployments/#list-deployment-statuses
    if (['Get a single deployment status', 'List deployment statuses'].includes(operation.summary)) {
      operation.parameters = operation.parameters.filter(param => param.name !== 'id')
    }

    // The titles on these 3 pages are the same:
    // 1. https://developer.github.com/enterprise/2.15/v3/enterprise-admin/pre_receive_hooks/#get-a-single-pre-receive-hook
    // 2. https://developer.github.com/enterprise/2.15/v3/enterprise-admin/org_pre_receive_hooks/#get-a-single-pre-receive-hook
    // 3. https://developer.github.com/enterprise/2.15/v3/enterprise-admin/repo_pre_receive_hooks/#get-a-single-pre-receive-hook
    // Because they all end up on the same "enterpriseAdmin" scope, they end up conflicting.
    // To work around that, we append "-for-repo" / "-for-org" to the respective endpoints.
    // See https://github.com/octokit/routes/pull/336#issuecomment-452063583
    if (route.path.startsWith('/repos/:owner/:repo/pre-receive-hooks')) {
      operation.summary += ' for repository'
    }
    if (route.path.startsWith('/orgs/:org/pre-receive-hooks')) {
      operation.summary += ' for organization'
    }

    // https://github.com/octokit/routes/issues/332
    if (state.gheVersion <= 2.15 && route.path === '/repos/:owner/:repo/issues/:issue_number/labels' && ['POST', 'PUT'].includes(route.method)) {
      operation.parameters.push({
        mapTo: 'input',
        name: 'labels',
        type: 'string',
        required: true,
        description: '',
        location: 'body'
      })
    }

    // "Render a Markdown document in raw mode" requires Content-Type header to be set
    // see https://developer.github.com/v3/markdown/#example-1
    // TODO: clone response and add as text/plain and text/x-markdown
    //       put "parameter" description in response description
    /*
    if (route.path === '/markdown/raw') {
      operation.parameters.push({
        name: 'content-type',
        description: 'Setting to `text/plain; charset=utf-8` is recommended',
        in: 'header',
        schema: {
          type: 'string',
          default: 'text/plain; charset=utf-8'
        }
      })
    }
    */
  })
}

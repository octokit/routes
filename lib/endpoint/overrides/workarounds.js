module.exports = workarounds

const toOperationId = require('../to-operation-id')

function workarounds (state) {
  const { scope } = state
  state.routes.forEach(route => {
    const { method, path, operation } = route

    // There are few cases when a whole page describes a single endpoint.
    // The titles on these pages don’t map well to method names, hence the overide
    // See https://github.com/octokit/routes/issues/50
    if (['Emojis', 'Meta'].includes(operation.summary)) {
      operation.summary = 'Get'
      operation.operationId = toOperationId(method, path, scope, operation.summary)
    }

    // https://github.com/octokit/routes/issues/287
    if (operation.summary === 'Create a comment (alternative)') {
      operation.summary = 'Create a comment reply'
      operation.operationId = toOperationId(method, path, scope, operation.summary)
    }
    if (operation.summary === 'create a Pull Request from an existing Issue by passing an Issue number ') {
      operation.summary = 'Create a Pull Request from an Issue'
      operation.operationId = toOperationId(method, path, scope, operation.summary)
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
      operation.operationId = toOperationId(method, path, scope, operation.summary)
    }
    if (route.path.startsWith('/orgs/:org/pre-receive-hooks')) {
      operation.summary += ' for organization'
      operation.operationId = toOperationId(method, path, scope, operation.summary)
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

    // We're not touching OpenAPI docs in this PR, just the doc gen algo, so:
    // TODO: Remove temporary workarounds that help gen the same OpenAPI docs
    delete operation.deprecated
    delete operation['x-github'].triggersNotification
    if ([
      'teams-create-or-update-id-p-group-connections',
      'teams-list-id-p-groups',
      'teams-list-id-p-groups-for-org'
    ].includes(operation.operationId)) {
      operation['x-github'].githubCloudOnly = false
    }
    if ([
      'users-check-blocked',
      'issues-check-assignee',
      'repos-delete',
      'orgs-check-blocked-user'
    ].includes(operation.operationId)) {
      delete operation.responses['403']
      delete operation.responses['404']
    }
  })
}

/**
 * We manually keep track endpoint name or parameter changes. It’s common that
 * an endpoint gets renamed in the documentation for better readability or a
 * URL parameter is being renamed. It makes no differences for the REST APIs.
 * But as the Octokit clients generate their methods based on these names, these
 * changes are causing breaking changes. To work around that, we keep track of
 * deprecations together with time stamps, so each Octokit client can decide at
 * what date to "cut off" the deprecations.
 */

module.exports = deprecations

function deprecations (endpoints) {
  // 2018-12-27 – "Search issues" renamed to "Search issues and pull requests"
  const searchIssuesAndPullRequests = findByRoute(endpoints, 'GET /search/issues')

  if (searchIssuesAndPullRequests) {
    const deprecated = Object.assign({}, searchIssuesAndPullRequests)
    deprecated.name = 'Search issues'
    deprecated.idName = 'search'
    deprecated.deprecated = {
      date: '2018-12-27',
      message: '"Search issues" has been renamed to "Search issues and pull requests"',
      before: {
        idName: 'issues'
      },
      after: {
        idName: 'issues-and-pull-requests'
      }
    }
    endpoints.push(deprecated)
  }

  // 2019-01-05 – "and" is no longer ignored for "idName"
  const getOrCreateAuthorizationForAppAndFingerprint = findByRoute(endpoints, 'PUT /authorizations/clients/:client_id/:fingerprint')
  if (getOrCreateAuthorizationForAppAndFingerprint) {
    const deprecated = Object.assign({}, getOrCreateAuthorizationForAppAndFingerprint)
    deprecated.idName = 'get-or-create-authorization-for-app-fingerprint'
    deprecated.deprecated = {
      date: '2018-12-27',
      message: '`idName` changed for "Get-or-create an authorization for a specific app and fingerprint". It now includes `-and-`',
      before: {
        idName: 'get-or-create-authorization-for-app-fingerprint'
      },
      after: {
        idName: 'get-or-create-authorization-for-app-and-fingerprint'
      }
    }
    endpoints.push(deprecated)
  }

  const provisionAndInviteUsers = findByRoute(endpoints, 'POST /scim/v2/organizations/:org/Users')
  if (provisionAndInviteUsers) {
    const deprecated = Object.assign({}, provisionAndInviteUsers)
    deprecated.idName = 'provision-invite-users'
    deprecated.deprecated = {
      date: '2018-12-27',
      message: '`idName` changed for "Provision and invite users". It now includes `-and-`',
      before: {
        idName: 'provision-invite-users'
      },
      after: {
        idName: 'provision-and-invite-users'
      }
    }
    endpoints.push(deprecated)
  }
}

function findByRoute (endpoints, route) {
  return endpoints.find(endpoint => {
    return route === `${endpoint.method} ${endpoint.path}`
  })
}

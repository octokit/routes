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

function deprecations (state, endpoints) {
  // 2018-12-27 – "Search issues" renamed to "Search issues and pull requests"
  const searchIssuesAndPullRequests = findByRoute(endpoints, 'GET /search/issues')

  if (searchIssuesAndPullRequests) {
    const deprecated = Object.assign({}, searchIssuesAndPullRequests)
    deprecated.name = 'Search issues'
    deprecated.idName = 'issues'
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

  // 2019-03-05 – "List all licenses" renamed to "List commonly used licenses"
  const listLicenses = findByRoute(endpoints, 'GET /licenses')

  if (listLicenses) {
    const deprecated = Object.assign({}, listLicenses)
    deprecated.name = 'List all licenses'
    deprecated.idName = 'list'
    deprecated.deprecated = {
      date: '2019-03-05',
      message: '"List all licenses" renamed to "List commonly used licenses"',
      before: {
        idName: 'list'
      },
      after: {
        idName: 'list-commonly-used'
      }
    }
    endpoints.push(deprecated)
  }

  // 2019-04-10 ":number" parameter is now ":issue_number", ":milestone_number", or ":pull_number"
  const ROUTES_WITH_RENAMED_NUMBER_PARAMETER = [
    'GET /repos/:owner/:repo/issues/:issue_number',
    'PATCH /repos/:owner/:repo/issues/:issue_number',
    'PUT /repos/:owner/:repo/issues/:issue_number/lock',
    'DELETE /repos/:owner/:repo/issues/:issue_number/lock',
    'POST /repos/:owner/:repo/issues/:issue_number/assignees',
    'DELETE /repos/:owner/:repo/issues/:issue_number/assignees',
    'GET /repos/:owner/:repo/issues/:issue_number/comments',
    'POST /repos/:owner/:repo/issues/:issue_number/comments',
    'GET /repos/:owner/:repo/issues/:issue_number/events',
    'GET /repos/:owner/:repo/issues/:issue_number/labels',
    'POST /repos/:owner/:repo/issues/:issue_number/labels',
    'DELETE /repos/:owner/:repo/issues/:issue_number/labels/:name',
    'PUT /repos/:owner/:repo/issues/:issue_number/labels',
    'DELETE /repos/:owner/:repo/issues/:issue_number/labels',
    'GET /repos/:owner/:repo/milestones/:milestone_number/labels',
    'GET /repos/:owner/:repo/milestones/:milestone_number',
    'PATCH /repos/:owner/:repo/milestones/:milestone_number',
    'DELETE /repos/:owner/:repo/milestones/:milestone_number',
    'GET /repos/:owner/:repo/issues/:issue_number/timeline',
    'GET /repos/:owner/:repo/pulls/:pull_number',
    'PATCH /repos/:owner/:repo/pulls/:pull_number',
    'GET /repos/:owner/:repo/pulls/:pull_number/commits',
    'GET /repos/:owner/:repo/pulls/:pull_number/files',
    'GET /repos/:owner/:repo/pulls/:pull_number/merge',
    'PUT /repos/:owner/:repo/pulls/:pull_number/merge',
    'GET /repos/:owner/:repo/pulls/:pull_number/comments',
    'POST /repos/:owner/:repo/pulls/:pull_number/comments',
    'POST /repos/:owner/:repo/pulls/:pull_number/comments',
    'GET /repos/:owner/:repo/pulls/:pull_number/requested_reviewers',
    'POST /repos/:owner/:repo/pulls/:pull_number/requested_reviewers',
    'DELETE /repos/:owner/:repo/pulls/:pull_number/requested_reviewers',
    'GET /repos/:owner/:repo/pulls/:pull_number/reviews',
    'GET /repos/:owner/:repo/pulls/:pull_number/reviews/:review_id',
    'DELETE /repos/:owner/:repo/pulls/:pull_number/reviews/:review_id',
    'GET /repos/:owner/:repo/pulls/:pull_number/reviews/:review_id/comments',
    'POST /repos/:owner/:repo/pulls/:pull_number/reviews',
    'PUT /repos/:owner/:repo/pulls/:pull_number/reviews/:review_id',
    'POST /repos/:owner/:repo/pulls/:pull_number/reviews/:review_id/events',
    'PUT /repos/:owner/:repo/pulls/:pull_number/reviews/:review_id/dismissals',
    'GET /repos/:owner/:repo/issues/:issue_number/reactions',
    'POST /repos/:owner/:repo/issues/:issue_number/reactions'
  ]

  ROUTES_WITH_RENAMED_NUMBER_PARAMETER.forEach(route => {
    findAllByRoute(endpoints, route).forEach(endpoint => {
      // don’t add if "number" parameter already exists
      if (endpoint.params.find(param => param.name === 'number')) {
        return
      }

      const newParam = endpoint.params.find(param => /_number$/.test(param.name))
      const deprecatedParam = Object.assign({}, newParam, {
        name: 'number',
        required: false,
        deprecated: {
          date: '2019-04-10',
          message: `"number" parameter renamed to "${newParam.name}"`,
          before: {
            name: 'number'
          },
          after: {
            name: newParam.name
          }
        }
      })

      endpoint.params.push(deprecatedParam)
    })
  })

  // 2019-04-10 – "Update a provisioned organization membership" renamed to "Replace a provisioned user's information"
  const replaceProvisionedUserInformation = findByRoute(endpoints, 'PUT /scim/v2/organizations/:org/Users/:scim_user_id')

  if (replaceProvisionedUserInformation) {
    const deprecated = Object.assign({}, replaceProvisionedUserInformation)
    deprecated.name = 'Update a provisioned organization membership'
    deprecated.idName = 'update-provisioned-org-membership'
    deprecated.deprecated = {
      date: '2019-04-10',
      message: '"Update a provisioned organization membership" renamed to "Replace a provisioned user\'s information"',
      before: {
        idName: 'update-provisioned-org-membership'
      },
      after: {
        idName: 'replace-provisioned-user-information'
      }
    }
    endpoints.push(deprecated)
  }

  // 2019-04-10 ":external_identity_guid" parameter renamed to ":scim_user_id"
  const ROUTES_WITH_RENAMED_SCIM_USER_ID_PARAMETER = [
    'GET /scim/v2/organizations/:org/Users/:scim_user_id',
    'PUT /scim/v2/organizations/:org/Users/:scim_user_id',
    'PUT /scim/v2/organizations/:org/Users/:scim_user_id',
    'PATCH /scim/v2/organizations/:org/Users/:scim_user_id',
    'DELETE /scim/v2/organizations/:org/Users/:scim_user_id'
  ]

  ROUTES_WITH_RENAMED_SCIM_USER_ID_PARAMETER.forEach(route => {
    findAllByRoute(endpoints, route).forEach(endpoint => {
      // don’t add if "external_identity_guid" parameter already exists
      if (endpoint.params.find(param => param.name === 'external_identity_guid')) {
        return
      }

      const newParam = endpoint.params.find(param => param.name === 'scim_user_id')
      const deprecatedParam = Object.assign({}, newParam, {
        name: 'external_identity_guid',
        required: false,
        deprecated: {
          date: '2019-04-10',
          message: '"external_identity_guid" parameter renamed to "scim_user_id"',
          before: {
            name: 'external_identity_guid'
          },
          after: {
            name: 'scim_user_id'
          }
        }
      })

      endpoint.params.push(deprecatedParam)
    })
  })

  // 2019-04-12 ":sha" parameter renamed to ":commit_sha" for "Get a single commit"
  const getCommit = findByRoute(endpoints, 'GET /repos/:owner/:repo/commits/:commit_sha')

  if (getCommit) {
    const newParam = getCommit.params.find(param => param.name === 'commit_sha')
    const deprecatedParam = Object.assign({}, newParam, {
      name: 'sha',
      required: false,
      deprecated: {
        date: '2019-04-10',
        message: '"sha" parameter renamed to "commit_sha"',
        before: {
          name: 'sha'
        },
        after: {
          name: 'commit_sha'
        }
      }
    })

    getCommit.params.push(deprecatedParam)
  }

  // 2019-04-18 Method name changes
  // - "Find organization installation" => "Get an organization installation" (find-org-installation => get-org-installation)
  // - "Find repository installation" => "Get a repository installation" (find-repo-installation => get-repo-installation)
  // - "Find user installation" => "Get a user installation" (find-user-installation => get-user-installation)
  const getOrgInstallation = findByRoute(endpoints, 'GET /orgs/:org/installation')
  if (getOrgInstallation) {
    const deprecated = Object.assign({}, getOrgInstallation)
    deprecated.name = 'Find organization installation'
    deprecated.idName = 'find-org-installation'
    deprecated.deprecated = {
      date: '2019-04-10',
      message: '"Find organization installation" renamed to "Get an organization installation"',
      before: {
        idName: 'find-org-installation'
      },
      after: {
        idName: 'get-org-installation'
      }
    }
    endpoints.push(deprecated)
  }

  const getRepoInstallation = findByRoute(endpoints, 'GET /repos/:owner/:repo/installation')
  if (getRepoInstallation) {
    const deprecated = Object.assign({}, getRepoInstallation)
    deprecated.name = 'Find repository installation'
    deprecated.idName = 'find-repo-installation'
    deprecated.deprecated = {
      date: '2019-04-10',
      message: '"Find repository installation" renamed to "Get a repository installation"',
      before: {
        idName: 'find-repo-installation'
      },
      after: {
        idName: 'get-repo-installation'
      }
    }
    endpoints.push(deprecated)
  }

  const getUserInstallation = findByRoute(endpoints, 'GET /users/:username/installation')
  if (getUserInstallation) {
    const deprecated = Object.assign({}, getUserInstallation)
    deprecated.name = 'Find repository installation'
    deprecated.idName = 'find-user-installation'
    deprecated.deprecated = {
      date: '2019-04-10',
      message: '"Find repository installation" renamed to "Get a repository installation"',
      before: {
        idName: 'find-user-installation'
      },
      after: {
        idName: 'get-user-installation'
      }
    }
    endpoints.push(deprecated)
  }

  // 2019-05-22 Deprecate "Get the SHA-1 of a commit reference"
  const getCommitShaForRef = findByRoute(endpoints, 'GET /repos/:owner/:repo/commits/:ref')
  if (getCommitShaForRef) {
    getCommitShaForRef.deprecated = {
      date: '2019-05-22',
      message: '"Get the SHA-1 of a commit reference" will be removed. Use "Get a single commit" instead with media type format set to "sha" instead.'
    }
  }
}

function findByRoute (endpoints, route) {
  return endpoints.find(endpoint => {
    return route === `${endpoint.method} ${endpoint.path}`
  })
}

function findAllByRoute (endpoints, route) {
  return endpoints.filter(endpoint => {
    return route === `${endpoint.method} ${endpoint.path}`
  })
}

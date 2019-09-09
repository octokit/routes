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

function deprecations ({ routes }) {
  // 2018-12-27 – "Search issues" renamed to "Search issues and pull requests"
  const searchIssuesAndPullRequests = findByRoute(routes, 'GET /search/issues')
  searchIssuesAndPullRequests && searchIssuesAndPullRequests.operation['x-changes'].push({
    type: 'idName',
    date: '2018-12-27',
    note: '"Search issues" has been renamed to "Search issues and pull requests"',
    meta: {
      before: {
        idName: 'issues'
      },
      after: {
        idName: 'issues-and-pull-requests'
      }
    }
  })

  // 2019-01-05 – "and" is no longer ignored for "idName"
  const getOrCreateAuthorizationForAppAndFingerprint = findByRoute(routes, 'PUT /authorizations/clients/:client_id/:fingerprint')
  getOrCreateAuthorizationForAppAndFingerprint && getOrCreateAuthorizationForAppAndFingerprint.operation['x-changes'].push({
    type: 'idName',
    date: '2018-12-27',
    note: '`idName` changed for "Get-or-create an authorization for a specific app and fingerprint". It now includes `-and-`',
    meta: {
      before: {
        idName: 'get-or-create-authorization-for-app-fingerprint'
      },
      after: {
        idName: 'get-or-create-authorization-for-app-and-fingerprint'
      }
    }
  })

  const provisionAndInviteUsers = findByRoute(routes, 'POST /scim/v2/organizations/:org/Users')
  provisionAndInviteUsers && provisionAndInviteUsers.operation['x-changes'].push({
    type: 'idName',
    date: '2018-12-27',
    note: '`idName` changed for "Provision and invite users". It now includes `-and-`',
    meta: {
      before: {
        idName: 'provision-invite-users'
      },
      after: {
        idName: 'provision-and-invite-users'
      }
    }
  })

  // 2019-03-05 – "List all licenses" renamed to "List commonly used licenses"
  const listLicenses = findByRoute(routes, 'GET /licenses')
  listLicenses && listLicenses.operation['x-changes'].push({
    type: 'idName',
    date: '2019-03-05',
    note: '"List all licenses" renamed to "List commonly used licenses"',
    meta: {
      before: {
        idName: 'list'
      },
      after: {
        idName: 'list-commonly-used'
      }
    }
  })

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

  ROUTES_WITH_RENAMED_NUMBER_PARAMETER.forEach(endpoint => {
    findAllByRoute(routes, endpoint).forEach(route => {
      // don’t add if "number" parameter already exists
      if (route.operation.parameters.find(param => param.name === 'number')) {
        return
      }

      const { name } = route.operation.parameters.find(param => /_number$/.test(param.name))
      const isChangeMissing = !route.operation['x-changes']
        .find(change => change.type === 'parameter' && change.note === `"number" parameter renamed to "${name}"`)
      isChangeMissing && route.operation['x-changes'].push({
        type: 'parameter',
        date: '2019-04-10',
        note: `"number" parameter renamed to "${name}"`,
        meta: {
          before: 'number',
          after: name
        }
      })
    })
  })

  // 2019-04-10 – "Update a provisioned organization membership" renamed to "Replace a provisioned user's information"
  const replaceProvisionedUserInformation = findByRoute(routes, 'PUT /scim/v2/organizations/:org/Users/:scim_user_id')
  replaceProvisionedUserInformation && replaceProvisionedUserInformation.operation['x-changes'].push({
    type: 'idName',
    date: '2019-04-10',
    note: '"Update a provisioned organization membership" renamed to "Replace a provisioned user\'s information"',
    meta: {
      before: {
        idName: 'update-provisioned-org-membership'
      },
      after: {
        idName: 'replace-provisioned-user-information'
      }
    }
  })

  // 2019-04-10 ":external_identity_guid" parameter renamed to ":scim_user_id"
  const ROUTES_WITH_RENAMED_SCIM_USER_ID_PARAMETER = [
    'GET /scim/v2/organizations/:org/Users/:scim_user_id',
    'PUT /scim/v2/organizations/:org/Users/:scim_user_id',
    'PATCH /scim/v2/organizations/:org/Users/:scim_user_id',
    'DELETE /scim/v2/organizations/:org/Users/:scim_user_id'
  ]

  ROUTES_WITH_RENAMED_SCIM_USER_ID_PARAMETER.forEach(endpoint => {
    findAllByRoute(routes, endpoint).forEach(route => {
      // don’t add if "external_identity_guid" parameter already exists
      if (route.operation.parameters.find(param => param.name === 'external_identity_guid')) {
        return
      }

      route.operation['x-changes'].push({
        type: 'parameter',
        date: '2019-04-10',
        note: '"external_identity_guid" parameter renamed to "scim_user_id"',
        meta: {
          before: 'external_identity_guid',
          after: 'scim_user_id'
        }
      })
    })
  })

  const getCommit = findByRoute(routes, 'GET /repos/:owner/:repo/commits/:ref')

  // 2019-05-22 Deprecate "Get the SHA-1 of a commit reference"
  // if (getCommit) {
  //   const deprecatedGetCommitShaForRef = cloneDeep(getCommit)

  //   deprecatedGetCommitShaForRef.responses[0] = {
  //     headers: {
  //       status: '200 OK'
  //     }
  //   }

  //   deprecatedGetCommitShaForRef.deprecated = {
  //     date: '2019-05-22',
  //     message: '"Get the SHA-1 of a commit reference" will be removed. Use "Get a single commit" instead with media type format set to "sha" instead.'
  //   }
  //   deprecatedGetCommitShaForRef.name = 'Get the SHA-1 of a commit reference'
  //   deprecatedGetCommitShaForRef.description = '**Note:** To access this endpoint, you must provide a custom [media type](https://developer.github.com/v3/media) in the `Accept` header:\n\n```\napplication/vnd.github.VERSION.sha\n\n```\n\nReturns the SHA-1 of the commit reference. You must have `read` access for the repository to get the SHA-1 of a commit reference. You can use this endpoint to check if a remote reference\'s SHA-1 is the same as your local reference\'s SHA-1 by providing the local SHA-1 reference as the ETag.\n\n'
  //   deprecatedGetCommitShaForRef.idName = 'get-commit-ref-sha'

  //   routes.push(deprecatedGetCommitShaForRef)
  // }

  // 2019-04-12 ":sha" parameter renamed to ":commit_sha" for "Get a single commit"
  // 2019-06-21 ":commit_sha" parameter renamed to ":ref" for "Get a single commit"
  getCommit && getCommit.operation['x-changes'].push(
    {
      type: 'parameter',
      date: '2019-04-10',
      note: '"sha" parameter renamed to "ref"',
      meta: {
        before: 'sha',
        after: 'ref'
      }
    },
    {
      type: 'parameter',
      date: '2019-06-21',
      note: '"commit_sha" parameter renamed to "ref"',
      meta: {
        before: 'commit_sha',
        after: 'ref'
      }
    }
  )

  // 2019-04-18 Method name changes
  // - "Find organization installation" => "Get an organization installation" (find-org-installation => get-org-installation)
  // - "Find repository installation" => "Get a repository installation" (find-repo-installation => get-repo-installation)
  // - "Find user installation" => "Get a user installation" (find-user-installation => get-user-installation)
  const getOrgInstallation = findByRoute(routes, 'GET /orgs/:org/installation')
  getOrgInstallation && getOrgInstallation.operation['x-changes'].push({
    type: 'idName',
    date: '2019-04-10',
    note: '"Find organization installation" renamed to "Get an organization installation"',
    meta: {
      before: {
        idName: 'find-org-installation'
      },
      after: {
        idName: 'get-org-installation'
      }
    }
  })

  const getRepoInstallation = findByRoute(routes, 'GET /repos/:owner/:repo/installation')
  getRepoInstallation && getRepoInstallation.operation['x-changes'].push({
    type: 'idName',
    date: '2019-04-10',
    note: '"Find repository installation" renamed to "Get a repository installation"',
    meta: {
      before: {
        idName: 'find-repo-installation'
      },
      after: {
        idName: 'get-repo-installation'
      }
    }
  })

  const getUserInstallation = findByRoute(routes, 'GET /users/:username/installation')
  getUserInstallation && getUserInstallation.operation['x-changes'].push({
    type: 'idName',
    date: '2019-04-10',
    note: '"Find repository installation" renamed to "Get a repository installation"',
    meta: {
      before: {
        idName: 'find-user-installation'
      },
      after: {
        idName: 'get-user-installation'
      }
    }
  })

  // 2019-06-07 URL parameter "ref"  renamed to "commit_sha" for "List comments for Commit"
  const listCommentsForCommit = findByRoute(routes, 'GET /repos/:owner/:repo/commits/:commit_sha/comments')
  listCommentsForCommit && listCommentsForCommit.operation['x-changes'].push({
    type: 'parameter',
    date: '2019-06-07',
    note: '"ref" parameter renamed to "commit_sha"',
    meta: {
      before: 'ref',
      after: 'commit_sha'
    }
  })

  // 2019-06-07 URL parameter "sha"  renamed to "commit_sha" for "Create a commit comment"
  const createCommitComment = findByRoute(routes, 'POST /repos/:owner/:repo/commits/:commit_sha/comments')
  createCommitComment && createCommitComment.operation['x-changes'].push({
    type: 'parameter',
    date: '2019-06-07',
    note: '"sha" parameter renamed to "commit_sha"',
    meta: {
      before: 'sha',
      after: 'commit_sha'
    }
  })

  // 2019-06-07 "Create a file" & "Update a file" is now "Create or update a file"
  const createOrUpdateFile = findByRoute(routes, 'PUT /repos/:owner/:repo/contents/:path')
  if (createOrUpdateFile && createOrUpdateFile.operation.operationId.endsWith('create-or-update-file')) {
    createOrUpdateFile.operation['x-changes'].push({
      type: 'idName',
      date: '2019-06-07',
      note: '"Create a file" replaced by "Create or update a file"',
      meta: {
        before: {
          idName: 'create-file'
        },
        after: {
          idName: 'create-or-update-file'
        }
      }
    })
    createOrUpdateFile.operation['x-changes'].push({
      type: 'idName',
      date: '2019-06-07',
      note: '"Update a file" replaced by "Create or update a file"',
      meta: {
        before: {
          idName: 'update-file'
        },
        after: {
          idName: 'create-or-update-file'
        }
      }
    })
  }

  // 2019-09-09 idName changed for "Create a comment" for pull request reviews
  const createPullRequestReviewComment = findByRoute(routes, 'POST /repos/:owner/:repo/pulls/:pull_number/comments')
  if (createPullRequestReviewComment) {
    createPullRequestReviewComment.operation['x-changes'].push({
      type: 'idName',
      date: '2019-09-09',
      note: '"Create a comment reply" is now "Create a comment". To create a pull request review comment reply, use the new "Create a review comment reply" endpoint',
      meta: {
        before: {
          idName: 'create-comment-reply'
        },
        after: {
          idName: 'create-comment'
        }
      }
    })
  }

  // 2019-09-09 idName changed for "List team restrictions of protected branch"
  const listTeamsWithAccessToProtectedBranch = findByRoute(routes, 'GET /repos/:owner/:repo/branches/:branch/protection/restrictions/teams')
  if (listTeamsWithAccessToProtectedBranch) {
    listTeamsWithAccessToProtectedBranch.operation['x-changes'].push({
      type: 'idName',
      date: '2019-09-09',
      note: '"List team restrictions of protected branch" is now "List teams with access to protected branch"',
      meta: {
        before: {
          idName: 'list-protected-branch-team-restrictions'
        },
        after: {
          idName: 'list-teams-with-access-to-protected-branch'
        }
      }
    })
  }

  // 2019-09-09 idName changed for "List user restrictions of protected branch"
  const listUsersWithAccessToProtectedBranch = findByRoute(routes, 'GET /repos/:owner/:repo/branches/:branch/protection/restrictions/users')
  if (listUsersWithAccessToProtectedBranch) {
    listUsersWithAccessToProtectedBranch.operation['x-changes'].push({
      type: 'idName',
      date: '2019-09-09',
      note: '"List user restrictions of protected branch" is now "List users with access to protected branch"',
      meta: {
        before: {
          idName: 'list-protected-branch-user-restrictions'
        },
        after: {
          idName: 'list-users-with-access-to-protected-branch'
        }
      }
    })
  }
}

function findByRoute (routes, route) {
  return routes.find(({ method, path }) => {
    return route === `${method} ${path}`
  })
}

function findAllByRoute (routes, route) {
  return routes.filter(({ method, path }) => {
    return route === `${method} ${path}`
  })
}

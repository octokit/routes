/**
 * We manually keep track endpoint name or parameter changes. It’s common that
 * an endpoint gets renamed in the documentation for better readability or a
 * URL parameter is being renamed. It makes no differences for the REST APIs.
 * But as the Octokit clients generate their methods based on these names, these
 * changes are causing breaking changes. To work around that, we keep track of
 * deprecations together with time stamps, so each Octokit client can decide at
 * what date to "cut off" the deprecations.
 *
 * Deprecations are stored in the `"x-changes"` extension. Each Deprecation has
 * 3 properties
 *
 * 1. `type`: either `"operation"` or `"parameter"`
 * 2. `date`: timestamp in `YYYY-MM-DD` format
 * 3. `note`: An explenation about the deprecation
 *
 * Additionally, each deprecation can have a before or both before & after properties.
 * `before` / `after` should be directly applicaple to either the operation or the
 * parameter with the given `name`. The most common deprecations are renames of
 * `operationId`s or parameter `name`s, in which cases the changes look like this
 * for an operation deprecation
 *
 *    before: {
 *      operationId: "search/issues"
 *    },
 *    after: {
 *      operationId: "search/issues-and-pull-requests"
 *    }
 *
 * And like this for a parameter deprecation
 *
 *    before: {
 *      name: "external_identity_guid"
 *    },
 *    after: {
 *      name: "scim_user_id"
 *    }
 *
 * In some cases, a method or parameter is deprecated entirely, in which case there is
 * no `after` key, and the `before` key can have more keys to bring back e.g. a no longer
 * documented parameter. Example
 *
 *    before: {
 *      name: "in_reply_to",
 *      description:
 *        "The comment ID to reply to. **Note**: This must be the ID of a top-level comment, not a reply to that comment. Replies to replies are not supported.",
 *      in: "body",
 *      schema: {
 *        type: "integer"
 *      }
 *    },
 *    after: {}
 *
 * In order to apply deprecations to GitHub Enterprise above a sepicific version, wrap
 * the code in an if statement such as
 *
 *    // apply to api.github.com and GHE version 2.18 and above
 *    if (!gheVersion || gheVersion >= 2.18) {
 *      // ...
 *    }
 *
 */

module.exports = deprecations;

function deprecations({ routes, gheVersion }) {
  // 2018-12-27 – "Search issues" renamed to "Search issues and pull requests"
  const searchIssuesAndPullRequests = findByRoute(routes, "GET /search/issues");
  searchIssuesAndPullRequests &&
    searchIssuesAndPullRequests.operation["x-changes"].push({
      type: "operation",
      date: "2018-12-27",
      note:
        '"Search issues" has been renamed to "Search issues and pull requests"',

      before: {
        operationId: "search/issues"
      },
      after: {
        operationId: "search/issues-and-pull-requests"
      }
    });

  // 2019-01-05 – "and" is no longer ignored for "idName"
  const getOrCreateAuthorizationForAppAndFingerprint = findByRoute(
    routes,
    "PUT /authorizations/clients/:client_id/:fingerprint"
  );
  getOrCreateAuthorizationForAppAndFingerprint &&
    getOrCreateAuthorizationForAppAndFingerprint.operation["x-changes"].push({
      type: "operation",
      date: "2018-12-27",
      note:
        '`idName` changed for "Get-or-create an authorization for a specific app and fingerprint". It now includes `-and-`',

      before: {
        operationId:
          "oauth-authorizations/get-or-create-authorization-for-app-fingerprint"
      },
      after: {
        operationId:
          "oauth-authorizations/get-or-create-authorization-for-app-and-fingerprint"
      }
    });

  const provisionAndInviteUsers = findByRoute(
    routes,
    "POST /scim/v2/organizations/:org/Users"
  );
  provisionAndInviteUsers &&
    provisionAndInviteUsers.operation["x-changes"].push({
      type: "operation",
      date: "2018-12-27",
      note:
        '`idName` changed for "Provision and invite users". It now includes `-and-`',
      before: {
        operationId: "scim/provision-invite-users"
      },
      after: {
        operationId: "scim/provision-and-invite-users"
      }
    });

  // 2019-03-05 – "List all licenses" renamed to "List commonly used licenses"
  const listLicenses = findByRoute(routes, "GET /licenses");
  listLicenses &&
    listLicenses.operation["x-changes"].push({
      type: "operation",
      date: "2019-03-05",
      note: '"List all licenses" renamed to "List commonly used licenses"',
      before: {
        operationId: "licenses/list"
      },
      after: {
        operationId: "licenses/list-commonly-used"
      }
    });

  // 2019-04-10 ":number" parameter is now ":issue_number", ":milestone_number", or ":pull_number"
  const ROUTES_WITH_RENAMED_NUMBER_PARAMETER = [
    "GET /repos/:owner/:repo/issues/:issue_number",
    "PATCH /repos/:owner/:repo/issues/:issue_number",
    "PUT /repos/:owner/:repo/issues/:issue_number/lock",
    "DELETE /repos/:owner/:repo/issues/:issue_number/lock",
    "POST /repos/:owner/:repo/issues/:issue_number/assignees",
    "DELETE /repos/:owner/:repo/issues/:issue_number/assignees",
    "GET /repos/:owner/:repo/issues/:issue_number/comments",
    "POST /repos/:owner/:repo/issues/:issue_number/comments",
    "GET /repos/:owner/:repo/issues/:issue_number/events",
    "GET /repos/:owner/:repo/issues/:issue_number/labels",
    "POST /repos/:owner/:repo/issues/:issue_number/labels",
    "DELETE /repos/:owner/:repo/issues/:issue_number/labels/:name",
    "PUT /repos/:owner/:repo/issues/:issue_number/labels",
    "DELETE /repos/:owner/:repo/issues/:issue_number/labels",
    "GET /repos/:owner/:repo/milestones/:milestone_number/labels",
    "GET /repos/:owner/:repo/milestones/:milestone_number",
    "PATCH /repos/:owner/:repo/milestones/:milestone_number",
    "DELETE /repos/:owner/:repo/milestones/:milestone_number",
    "GET /repos/:owner/:repo/issues/:issue_number/timeline",
    "GET /repos/:owner/:repo/pulls/:pull_number",
    "PATCH /repos/:owner/:repo/pulls/:pull_number",
    "GET /repos/:owner/:repo/pulls/:pull_number/commits",
    "GET /repos/:owner/:repo/pulls/:pull_number/files",
    "GET /repos/:owner/:repo/pulls/:pull_number/merge",
    "PUT /repos/:owner/:repo/pulls/:pull_number/merge",
    "GET /repos/:owner/:repo/pulls/:pull_number/comments",
    "POST /repos/:owner/:repo/pulls/:pull_number/comments",
    "GET /repos/:owner/:repo/pulls/:pull_number/requested_reviewers",
    "POST /repos/:owner/:repo/pulls/:pull_number/requested_reviewers",
    "DELETE /repos/:owner/:repo/pulls/:pull_number/requested_reviewers",
    "GET /repos/:owner/:repo/pulls/:pull_number/reviews",
    "GET /repos/:owner/:repo/pulls/:pull_number/reviews/:review_id",
    "DELETE /repos/:owner/:repo/pulls/:pull_number/reviews/:review_id",
    "GET /repos/:owner/:repo/pulls/:pull_number/reviews/:review_id/comments",
    "POST /repos/:owner/:repo/pulls/:pull_number/reviews",
    "PUT /repos/:owner/:repo/pulls/:pull_number/reviews/:review_id",
    "POST /repos/:owner/:repo/pulls/:pull_number/reviews/:review_id/events",
    "PUT /repos/:owner/:repo/pulls/:pull_number/reviews/:review_id/dismissals",
    "GET /repos/:owner/:repo/issues/:issue_number/reactions",
    "POST /repos/:owner/:repo/issues/:issue_number/reactions"
  ];

  ROUTES_WITH_RENAMED_NUMBER_PARAMETER.forEach(endpoint => {
    findAllByRoute(routes, endpoint).forEach(route => {
      // don’t add if "number" parameter already exists
      if (route.operation.parameters.find(param => param.name === "number")) {
        return;
      }

      const { name } = route.operation.parameters.find(param =>
        /_number$/.test(param.name)
      );
      const isChangeMissing = !route.operation["x-changes"].find(
        change =>
          change.type === "parameter" &&
          change.note === `"number" parameter renamed to "${name}"`
      );
      isChangeMissing &&
        route.operation["x-changes"].push({
          type: "parameter",
          date: "2019-04-10",
          note: `"number" parameter renamed to "${name}"`,
          before: {
            name: "number"
          },
          after: {
            name: name
          }
        });
    });
  });

  // 2019-04-10 – "Update a provisioned organization membership" renamed to "Replace a provisioned user's information"
  const replaceProvisionedUserInformation = findByRoute(
    routes,
    "PUT /scim/v2/organizations/:org/Users/:scim_user_id"
  );
  replaceProvisionedUserInformation &&
    replaceProvisionedUserInformation.operation["x-changes"].push({
      type: "operation",
      date: "2019-04-10",
      note:
        '"Update a provisioned organization membership" renamed to "Replace a provisioned user\'s information"',
      before: {
        operationId: "scim/update-provisioned-org-membership"
      },
      after: {
        operationId: "scim/replace-provisioned-user-information"
      }
    });

  // 2019-04-10 ":external_identity_guid" parameter renamed to ":scim_user_id"
  const ROUTES_WITH_RENAMED_SCIM_USER_ID_PARAMETER = [
    "GET /scim/v2/organizations/:org/Users/:scim_user_id",
    "PUT /scim/v2/organizations/:org/Users/:scim_user_id",
    "PATCH /scim/v2/organizations/:org/Users/:scim_user_id",
    "DELETE /scim/v2/organizations/:org/Users/:scim_user_id"
  ];

  ROUTES_WITH_RENAMED_SCIM_USER_ID_PARAMETER.forEach(endpoint => {
    findAllByRoute(routes, endpoint).forEach(route => {
      // don’t add if "external_identity_guid" parameter already exists
      if (
        route.operation.parameters.find(
          param => param.name === "external_identity_guid"
        )
      ) {
        return;
      }

      route.operation["x-changes"].push({
        type: "parameter",
        date: "2019-04-10",
        note: '"external_identity_guid" parameter renamed to "scim_user_id"',
        before: {
          name: "external_identity_guid"
        },
        after: {
          name: "scim_user_id"
        }
      });
    });
  });

  const getCommit = findByRoute(routes, "GET /repos/:owner/:repo/commits/:ref");

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
  getCommit &&
    getCommit.operation["x-changes"].push(
      {
        type: "parameter",
        date: "2019-04-10",
        note: '"sha" parameter renamed to "ref"',
        before: {
          name: "sha"
        },
        after: {
          name: "ref"
        }
      },
      {
        type: "parameter",
        date: "2019-06-21",
        note: '"commit_sha" parameter renamed to "ref"',
        before: {
          name: "commit_sha"
        },
        after: {
          name: "ref"
        }
      }
    );

  // 2019-04-18 Method name changes
  // - "Find organization installation" => "Get an organization installation" (find-org-installation => get-org-installation)
  // - "Find repository installation" => "Get a repository installation" (find-repo-installation => get-repo-installation)
  // - "Find user installation" => "Get a user installation" (find-user-installation => get-user-installation)
  const getOrgInstallation = findByRoute(routes, "GET /orgs/:org/installation");
  getOrgInstallation &&
    getOrgInstallation.operation["x-changes"].push({
      type: "operation",
      date: "2019-04-10",
      note:
        '"Find organization installation" renamed to "Get an organization installation"',
      before: {
        operationId: "apps/find-org-installation"
      },
      after: {
        operationId: "apps/get-org-installation"
      }
    });

  const getRepoInstallation = findByRoute(
    routes,
    "GET /repos/:owner/:repo/installation"
  );
  getRepoInstallation &&
    getRepoInstallation.operation["x-changes"].push({
      type: "operation",
      date: "2019-04-10",
      note:
        '"Find repository installation" renamed to "Get a repository installation"',
      before: {
        operationId: "apps/find-repo-installation"
      },
      after: {
        operationId: "apps/get-repo-installation"
      }
    });

  const getUserInstallation = findByRoute(
    routes,
    "GET /users/:username/installation"
  );
  getUserInstallation &&
    getUserInstallation.operation["x-changes"].push({
      type: "operation",
      date: "2019-04-10",
      note:
        '"Find repository installation" renamed to "Get a repository installation"',
      before: {
        operationId: "apps/find-user-installation"
      },
      after: {
        operationId: "apps/get-user-installation"
      }
    });

  // 2019-06-07 URL parameter "ref"  renamed to "commit_sha" for "List comments for Commit"
  const listCommentsForCommit = findByRoute(
    routes,
    "GET /repos/:owner/:repo/commits/:commit_sha/comments"
  );
  listCommentsForCommit &&
    listCommentsForCommit.operation["x-changes"].push({
      type: "parameter",
      date: "2019-06-07",
      note: '"ref" parameter renamed to "commit_sha"',
      before: {
        name: "ref"
      },
      after: {
        name: "commit_sha"
      }
    });

  // 2019-06-07 URL parameter "sha"  renamed to "commit_sha" for "Create a commit comment"
  const createCommitComment = findByRoute(
    routes,
    "POST /repos/:owner/:repo/commits/:commit_sha/comments"
  );
  createCommitComment &&
    createCommitComment.operation["x-changes"].push({
      type: "parameter",
      date: "2019-06-07",
      note: '"sha" parameter renamed to "commit_sha"',
      before: {
        name: "sha"
      },
      after: {
        name: "commit_sha"
      }
    });

  // 2019-06-07 "Create a file" & "Update a file" is now "Create or update a file"
  const createOrUpdateFile = findByRoute(
    routes,
    "PUT /repos/:owner/:repo/contents/:path"
  );
  if (
    createOrUpdateFile &&
    createOrUpdateFile.operation.operationId.endsWith("create-or-update-file")
  ) {
    createOrUpdateFile.operation["x-changes"].push({
      type: "operation",
      date: "2019-06-07",
      note: '"Create a file" replaced by "Create or update a file"',
      before: {
        operationId: "repos/create-file"
      },
      after: {
        operationId: "repos/create-or-update-file"
      }
    });
    createOrUpdateFile.operation["x-changes"].push({
      type: "operation",
      date: "2019-06-07",
      note: '"Update a file" replaced by "Create or update a file"',
      before: {
        operationId: "repos/update-file"
      },
      after: {
        operationId: "repos/create-or-update-file"
      }
    });
  }

  if (!gheVersion || gheVersion >= 2.18) {
    // 2019-09-09 idName changed for "Create a comment" for pull request reviews
    const createPullRequestReviewComment = findByRoute(
      routes,
      "POST /repos/:owner/:repo/pulls/:pull_number/comments"
    );
    if (createPullRequestReviewComment) {
      createPullRequestReviewComment.operation["x-changes"].push({
        type: "operation",
        date: "2019-09-09",
        note:
          '"Create a comment reply" is now "Create a comment". To create a pull request review comment reply, use the new "Create a review comment reply" endpoint',
        before: {
          operationId: "pulls/create-comment-reply"
        },
        after: {
          operationId: "pulls/create-comment"
        }
      });
      createPullRequestReviewComment.operation["x-changes"].push({
        type: "parameter",
        date: "2019-09-09",
        note:
          '"in_reply_to" parameter is deprecated for "Create a comment". To create a pull request review comment reply, use the new "Create a review comment reply" endpoint',
        before: {
          name: "in_reply_to",
          description:
            "The comment ID to reply to. **Note**: This must be the ID of a top-level comment, not a reply to that comment. Replies to replies are not supported.",
          in: "body",
          type: "integer"
        },
        after: {}
      });
    }
  }

  // 2019-09-09 idName changed for "List team restrictions of protected branch"
  const getTeamsWithAccessToProtectedBranch = findByRoute(
    routes,
    "GET /repos/:owner/:repo/branches/:branch/protection/restrictions/teams"
  );
  if (getTeamsWithAccessToProtectedBranch) {
    getTeamsWithAccessToProtectedBranch.operation["x-changes"].push({
      type: "operation",
      date: "2019-09-09",
      note:
        '"List team restrictions of protected branch" is now "Get teams with access to protected branch"',
      before: {
        operationId: "repos/list-protected-branch-team-restrictions"
      },
      after: {
        operationId: "repos/get-teams-with-access-to-protected-branch"
      }
    });
  }

  // 2019-09-09 idName changed for "List user restrictions of protected branch"
  // - updated on 2019-09-13 to new operationId
  const getUsersWithAccessToProtectedBranch = findByRoute(
    routes,
    "GET /repos/:owner/:repo/branches/:branch/protection/restrictions/users"
  );
  if (getUsersWithAccessToProtectedBranch) {
    getUsersWithAccessToProtectedBranch.operation["x-changes"].push({
      type: "operation",
      date: "2019-09-09",
      note:
        '"List user restrictions of protected branch" is now "Get users with access to protected branch"',
      before: {
        operationId: "repos/list-protected-branch-user-restrictions"
      },
      after: {
        operationId: "repos/get-users-with-access-to-protected-branch"
      }
    });
  }

  // 2019-09-13 idName changed for "List (Apps/Users/Teams) with access to protected branch"
  const getAppsWithAccessToProtectedBranch = findByRoute(
    routes,
    "GET /repos/:owner/:repo/branches/:branch/protection/restrictions/apps"
  );

  [
    getAppsWithAccessToProtectedBranch,
    getTeamsWithAccessToProtectedBranch,
    getUsersWithAccessToProtectedBranch
  ]
    .filter(Boolean)
    .forEach(endpoint => {
      endpoint.operation["x-changes"].push({
        type: "operation",
        date: "2019-09-13",
        note: `"${endpoint.operation.summary.replace(
          /^\w+/,
          "List"
        )}" is now "${endpoint.operation.summary}"`,
        before: {
          operationId: endpoint.operation.operationId.replace(/\/get/, "/list")
        },
        after: {
          operationId: endpoint.operation.operationId
        }
      });
    });

  if (!gheVersion || gheVersion > 2.19) {
    const relocatedAuthorizationAccessTokenRoutes = findAllByPath(
      routes,
      "/applications/:client_id/tokens/:access_token"
    );
    relocatedAuthorizationAccessTokenRoutes.forEach(endpoint => {
      endpoint.operation["x-changes"].push({
        type: "operation",
        date: "2019-11-05",
        note: `"${endpoint.operation.summary}" has been moved from "OAuth Authorizations" to "Apps"`,
        before: {
          operationId: endpoint.operation.operationId.replace(
            /apps\//,
            "oauth-authorizations/"
          )
        },
        after: {
          operationId: endpoint.operation.operationId
        }
      });
    });

    const revokeGrantForApplication = findByRoute(
      routes,
      "DELETE /applications/:client_id/grants/:access_token"
    );
    if (revokeGrantForApplication) {
      revokeGrantForApplication.operation["x-changes"].push({
        type: "operation",
        date: "2019-11-05",
        note: `"Revoke a grant for an application" has been moved from "OAuth Authorizations" to "Apps"`,
        before: {
          operationId: "oauth-authorizations/revoke-grant-for-application"
        },
        after: {
          operationId: "apps/revoke-grant-for-application"
        }
      });
    }
  }

  // 2020-01-16 idName changed for "List (Apps/Users/Teams) with access to protected branch"
  [
    "GET /teams/:team_id/members/:username",
    "PUT /teams/:team_id/members/:username",
    "DELETE /teams/:team_id/members/:username"
  ].forEach(route => {
    const endpoint = findByRoute(routes, route);
    if (!endpoint) return;

    endpoint.operation["x-changes"].push({
      type: "operation",
      date: "2020-01-16",
      note: `The path for "" changed  from "/teams/{team_id}*" to "/orgs/{org}/teams/{team_slug}*"). The operation ID for the old path now has a "-legacy" suffix. The route with the new path has a "-for-org" suffix in the operation ID to avoid breaking changes`,
      note: `"${endpoint.operation.summary.replace(" (Legacy)", "")}" is now "${
        endpoint.operation.summary
      }"`,
      before: {
        operationId: endpoint.operation.operationId.replace(/-legacy$/, "")
      },
      after: {
        operationId: endpoint.operation.operationId
      }
    });
  });

  if (!gheVersion) {
    [
      "GET /teams/:team_id",
      "PATCH /teams/:team_id",
      "DELETE /teams/:team_id",
      "GET /teams/:team_id/discussions",
      "POST /teams/:team_id/discussions",
      "GET /teams/:team_id/discussions/:discussion_number",
      "PATCH /teams/:team_id/discussions/:discussion_number",
      "DELETE /teams/:team_id/discussions/:discussion_number",
      "GET /teams/:team_id/discussions/:discussion_number/comments",
      "POST /teams/:team_id/discussions/:discussion_number/comments",
      "GET /teams/:team_id/discussions/:discussion_number/comments/:comment_number",
      "PATCH /teams/:team_id/discussions/:discussion_number/comments/:comment_number",
      "DELETE /teams/:team_id/discussions/:discussion_number/comments/:comment_number",
      "GET /teams/:team_id/discussions/:discussion_number/comments/:comment_number/reactions",
      "POST /teams/:team_id/discussions/:discussion_number/comments/:comment_number/reactions",
      "GET /teams/:team_id/discussions/:discussion_number/reactions",
      "POST /teams/:team_id/discussions/:discussion_number/reactions",
      "GET /teams/:team_id/invitations",
      "GET /teams/:team_id/members",
      "GET /teams/:team_id/memberships/:username",
      "PUT /teams/:team_id/memberships/:username",
      "GET /teams/:team_id/projects",
      "GET /teams/:team_id/projects/:project_id",
      "PUT /teams/:team_id/projects/:project_id",
      "DELETE /teams/:team_id/projects/:project_id",
      "GET /teams/:team_id/repos",
      "GET /teams/:team_id/repos/:owner/:repo",
      "PUT /teams/:team_id/repos/:owner/:repo",
      "DELETE /teams/:team_id/repos/:owner/:repo",
      "GET /teams/:team_id/team-sync/group-mappings",
      "PATCH /teams/:team_id/team-sync/group-mappings",
      "GET /teams/:team_id/teams"
    ].forEach(route => {
      const endpoint = findByRoute(routes, route);
      if (!endpoint) return;

      endpoint.operation["x-changes"].push({
        type: "operation",
        date: "2020-01-16",
        note: `The path for "${endpoint.operation.summary.replace(
          " (Legacy)",
          ""
        )}" changed  from "/teams/{team_id}*" to "/orgs/{org}/teams/{team_slug}*"). The operation ID for the old path now has a "-legacy" suffix. The route with the new path has a "-for-org" suffix in the operation ID to avoid breaking changes`,
        before: {
          operationId: endpoint.operation.operationId.replace(/-legacy$/, "")
        },
        after: {
          operationId: endpoint.operation.operationId
        }
      });
    });
  }
}

function findAllByPath(routes, path) {
  return routes.filter(route => {
    return path === route.path;
  });
}

function findByRoute(routes, route) {
  return routes.find(({ method, path }) => {
    return route === `${method} ${path}`;
  });
}

function findAllByRoute(routes, route) {
  return routes.filter(({ method, path }) => {
    return route === `${method} ${path}`;
  });
}

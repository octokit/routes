module.exports = addTriggersNotificationFlag

const ROUTES_THAT_TRIGGER_NOTIFICATIONS = [
  'POST /repos/:owner/:repo/issues', // https://developer.github.com/v3/issues/#create-an-issue))
  'POST /repos/:owner/:repo/issues/:number/comments', // https://developer.github.com/v3/issues/comments/#create-a-comment))
  'POST /repos/:owner/:repo/pulls', // https://developer.github.com/v3/pulls/#create-a-pull-request))
  'POST /repos/:owner/:repo/pulls/:number/comments', // https://developer.github.com/v3/pulls/comments/#create-a-comment))
  'POST /repos/:owner/:repo/pulls/:number/reviews ', // https://developer.github.com/v3/pulls/reviews/#create-a-pull-request-review))
  'POST /repos/:owner/:repo/pulls/:number/requested_reviewers', // https://developer.github.com/v3/pulls/review_requests/#create-a-review-request))
  'PUT /repos/:owner/:repo/pulls/:number/merge', // https://developer.github.com/v3/pulls/#merge-a-pull-request-merge-button))
  'POST /teams/:team_id/discussions ', // https://developer.github.com/v3/teams/discussions/#create-a-discussion))
  'POST /teams/:team_id/discussions/:discussion_number/comments', // https://developer.github.com/v3/teams/discussion_comments/#create-a-comment))
  'POST /repos/:owner/:repo/commits/:sha/comments', // https://developer.github.com/v3/repos/comments/#create-a-commit-comment))
  'POST /repos/:owner/:repo/releases', // https://developer.github.com/v3/repos/releases/#create-a-release))
  'POST /orgs/:org/invitations ', // https://developer.github.com/v3/orgs/members/#create-organization-invitation))
  'PUT /repos/:owner/:repo/collaborators/:username ' // https://developer.github.com/v3/repos/collaborators/#add-user-as-a-collaborator))
]

/**
 * From "Best practices for integrators"
 * > Requests that create content which triggers notifications, such as issues,
 *   comments and pull requests, may be further limited and will not include
 *   a Retry-After header in the response. Please create this content at a
 *   reasonable pace to avoid further limiting.
 * - Source: https://developer.github.com/v3/guides/best-practices-for-integrators/#dealing-with-abuse-rate-limits
 */
function addTriggersNotificationFlag (state) {
  state.results.forEach(endpoint => {
    const route = [endpoint.method, endpoint.path].join(' ')

    if (ROUTES_THAT_TRIGGER_NOTIFICATIONS.includes(route)) {
      endpoint.triggersNotification = true
    }
  })
}

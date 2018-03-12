module.exports = {
  activity: [].concat(
    require('./routes/activity-feeds.json'),
    require('./routes/activity-notifications.json'),
    require('./routes/activity-starring.json'),
    require('./routes/activity-watching.json'),
    require('./routes/activity-events.json')
  ),
  enterprise: [].concat(
    require('./routes/enterprise-pre-receive-environments.json'),
    require('./routes/enterprise-pre-receive-hooks.json'),
    require('./routes/enterprise-management-console.json'),
    require('./routes/enterprise-license.json'),
    require('./routes/enterprise-ldap.json'),
    require('./routes/enterprise-global-webhooks.json'),
    require('./routes/enterprise-admin-stats.json'),
    require('./routes/enterprise-organization-administration.json'),
    require('./routes/enterprise-search-indexing.json')
  ),
  gists: [].concat(
    require('./routes/gists-comments.json'),
    require('./routes/gists.json')
  ),
  git: [].concat(
    require('./routes/git-data-blobs.json'),
    require('./routes/git-data-tags.json'),
    require('./routes/git-data-references.json'),
    require('./routes/git-data-commits.json'),
    require('./routes/git-data-trees.json')
  ),
  github: [].concat(
    require('./routes/github-apps-installations.json'),
    require('./routes/github-apps-git-hub-marketplace.json'),
    require('./routes/github-apps.json')
  ),
  issues: [].concat(
    require('./routes/issues-milestones.json'),
    require('./routes/issues-comments.json'),
    require('./routes/issues-assignees.json'),
    require('./routes/issues.json'),
    require('./routes/issues-timeline.json'),
    require('./routes/issues-labels.json'),
    require('./routes/issues-events.json')
  ),
  migration: [].concat(
    require('./routes/migration-source-imports.json'),
    require('./routes/migration-migrations.json')
  ),
  miscellaneous: [].concat(
    require('./routes/miscellaneous-licenses.json'),
    require('./routes/miscellaneous-gitignore.json'),
    require('./routes/miscellaneous-rate-limit.json'),
    require('./routes/miscellaneous-markdown.json'),
    require('./routes/miscellaneous-codes-of-conduct.json')
  ),
  organizations: [].concat(
    require('./routes/organizations-blocking-users-organizations.json'),
    require('./routes/organizations-webhooks.json'),
    require('./routes/organizations-outside-collaborators.json'),
    require('./routes/organizations.json'),
    require('./routes/organizations-pre-receive-hooks-enterprise.json'),
    require('./routes/organizations-members.json')
  ),
  projects: [].concat(
    require('./routes/projects-cards.json'),
    require('./routes/projects.json'),
    require('./routes/projects-columns.json')
  ),
  pull: [].concat(
    require('./routes/pull-requests-review-requests.json'),
    require('./routes/pull-requests-review-comments.json'),
    require('./routes/pull-requests.json'),
    require('./routes/pull-requests-reviews.json')
  ),
  reactions: [].concat(
    require('./routes/reactions.json')
  ),
  repositories: [].concat(
    require('./routes/repositories-statuses.json'),
    require('./routes/repositories-traffic.json'),
    require('./routes/repositories-webhooks.json'),
    require('./routes/repositories-pre-receive-hooks-enterprise.json'),
    require('./routes/repositories-statistics.json'),
    require('./routes/repositories.json'),
    require('./routes/repositories-branches.json'),
    require('./routes/repositories-collaborators.json'),
    require('./routes/repositories-comments.json'),
    require('./routes/repositories-commits.json'),
    require('./routes/repositories-releases.json'),
    require('./routes/repositories-forks.json'),
    require('./routes/repositories-pages.json'),
    require('./routes/repositories-contents.json'),
    require('./routes/repositories-merging.json'),
    require('./routes/repositories-deploy-keys.json'),
    require('./routes/repositories-invitations.json'),
    require('./routes/repositories-downloads.json'),
    require('./routes/repositories-deployments.json'),
    require('./routes/repositories-community.json')
  ),
  scim: [].concat(
    require('./routes/scim.json')
  ),
  search: [].concat(
    require('./routes/search.json'),
    require('./routes/search-legacy-search.json')
  ),
  teams: [].concat(
    require('./routes/teams.json'),
    require('./routes/teams-discussions.json'),
    require('./routes/teams-discussion-comments.json'),
    require('./routes/teams-members.json')
  ),
  users: [].concat(
    require('./routes/users-gpg-keys.json'),
    require('./routes/users.json'),
    require('./routes/users-emails.json'),
    require('./routes/users-followers.json'),
    require('./routes/users-blocking-users.json'),
    require('./routes/users-administration-enterprise.json'),
    require('./routes/users-git-ssh-keys.json')
  )
}

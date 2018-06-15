module.exports = endpointToIdName

const {kebabCase} = require('lodash')
const pluralize = require('pluralize')

const fillWords = [
  'a',
  'all',
  'an',
  'and',
  'authenticated',
  'available',
  'being',
  'existing',
  'github',
  'has been',
  'individual',
  'if you are',
  'new',
  'single',
  'specific',
  'specified',
  'the',
  'this',
  'your'
]
const ignoreWordsAtEnd = [
  'about',
  'for',
  'from',
  'of',
  'on',
  'to'
]

function endpointToIdName (endpoint) {
  // endpoint-specific exceptions
  const route = `${endpoint.method} ${endpoint.path}`

  switch (route) {
    // suggested to change in docs
    case 'GET /gists': return 'list'
    case 'GET /issues': return 'list'
    case 'POST /markdown': return 'render'
    case 'POST /markdown/raw': return 'render-raw'
    case 'GET /marketplace_listing/plans/:id/accounts': return 'list-accounts-for-plan'
    case 'GET /marketplace_listing/stubbed/plans/:id/accounts': return 'list-accounts-for-plan-stubbed'
    case 'GET /orgs/:org/issues': return 'list-for-org'
    case 'GET /orgs/:org/members': return 'list-members'
    case 'GET /orgs/:org/public_members': return 'list-public-members'
    case 'GET /repos/:owner/:name/community/profile': return 'get-community-profile-metrics'
    case 'GET /repos/:owner/:repo/collaborators/:username/permission': return 'get-collaborator-permission-level'
    case 'POST /repos/:owner/:repo/merges': return 'merge'
    case 'GET /repos/:owner/:repo/pulls/:number/merge': return 'check-if-merged'
    case 'GET /repos/:owner/:repo/traffic/popular/paths': return 'get-top-paths'
    case 'GET /repos/:owner/:repo/traffic/popular/referrers': return 'get-top-referrers'
    case 'GET /scim/v2/organizations/:organization/Users': return 'get-provisioned-identities'
    case 'GET /teams/:team_id/discussions/:discussion_number/comments': return 'list-discussion-comments'
    case 'POST /teams/:team_id/discussions/:discussion_number/comments': return 'create-discussion-comment'
    case 'GET /teams/:team_id/discussions/:discussion_number/comments/:comment_number': return 'get-discussion-comment'
    case 'PATCH /teams/:team_id/discussions/:discussion_number/comments/:comment_number': return 'edit-discussion-comment'
    case 'DELETE /teams/:team_id/discussions/:discussion_number/comments/:comment_number': return 'delete-discussion-comment'
    case 'GET /user/marketplace_purchases': return 'list-marketplace-purchases'
    case 'GET /user/marketplace_purchases/stubbed': return 'list-marketplace-purchases-stubbed'
    case 'GET /users': return 'list'
    case 'GET /users/:username': return 'get-by-username'
    case 'GET /users/:username/orgs': return 'list-for-user'
    case 'GET /users/:username/repos': return 'list-for-user'
    case 'GET /repos/:owner/:repo/git/refs/:namespace': return 'list-references'
    case 'GET /user/teams': return 'list'
    case 'GET /user/repository_invitations': return 'list-invitations'
    case 'GET /repos/:owner/:repo/subscribers': return 'list-watchers-for-repo'
    case 'GET /repos/:owner/:repo/stargazers': return 'list-stargazers-for-repo'
    case 'GET /repos/:owner/:repo/issues/:number/timeline': return 'list-events-for-timeline'
    case 'GET /projects/:id/collaborators/:username/permission': return 'get-user-permission-level'
    case 'GET /teams/:id/projects/:project_id': return 'get-project'

    // https://github.com/octokit/routes/issues/173
    case 'POST /orgs/:org/migrations': return 'start-for-org'
    case 'GET /orgs/:org/migrations': return 'list-for-org'
    case 'GET /orgs/:org/migrations/:migration_id': return 'get-status-for-org'
    case 'GET /orgs/:org/migrations/:migration_id/archive': return 'download-archive-for-org'
    case 'DELETE /orgs/:org/migrations/:migration_id/archive': return 'delete-archive-for-org'
    case 'DELETE /orgs/:org/migrations/:migration_id/repos/:repo_name/lock': return 'unlock-org-repo'

    // permament workarounds
    case 'GET /orgs/:org/projects': return 'list-for-org'
    case 'POST /orgs/:org/projects': return 'create-for-org'
    case 'GET /orgs/:org/repos': return 'list-for-org'
    case 'GET /rate_limit': return 'get'
    case 'PATCH /repos/:owner/:repo/check-suites/preferences': return 'set-suites-preferences'
    case 'GET /gists/:id/star': return 'check-star'
    case 'GET /repos/:owner/:repo/community/code_of_conduct': return 'get-for-repo'
    case 'GET /repos/:owner/:repo/license': return 'get-for-repo'
    case 'GET /repos/:owner/:repo/compare/:base...:head': return 'compare-commits'
    case 'PATCH /repos/:owner/:repo/import/lfs': return 'set-lfs-preference'
    case 'GET /repos/:owner/:repo/milestones/:number/labels': return 'list-labels-for-milestone'
    case 'GET /repos/:owner/:repo/pages': return 'get-pages'
    case 'GET /repos/:owner/:repo/projects': return 'list-for-repo'
    case 'POST /repos/:owner/:repo/projects': return 'create-for-repo'
    case 'PUT /repos/:owner/:repo/pulls/:number/merge': return 'merge'
    case 'GET /repos/:owner/:repo/traffic/clones': return 'get-clones'
    case 'GET /repos/:owner/:repo/traffic/views': return 'get-views'
    case 'POST /scim/v2/organizations/:organization/Users': return 'provision-and-invite-users'
    case 'GET /teams/:id/repos/:owner/:repo': return 'check-repo'
    case 'GET /teams/:id/teams': return 'list-child-teams'
    case 'GET /user/blocks/:username': return 'check-blocked'
    case 'GET /user/following': return 'list-following'
    case 'GET /user/installations': return 'list-installations'
    case 'GET /user/installations/:installation_id/repositories': return 'list-installation-repos'
    case 'GET /user/issues': return 'list-for-user'
    case 'GET /user/subscriptions': return 'list-watched-repos'
    case 'GET /users/:username/followers': return 'list-followers-for-user'
    case 'GET /users/:username/following': return 'list-following-for-user'
    case 'GET /users/:username/following/:target_user': return 'check-following-for-user'
    case 'GET /users/:username/gpg_keys': return 'list-gpg-keys-for-user'
    case 'GET /users/:username/received_events': return 'list-received-events-for-user'
    case 'GET /users/:username/received_events/public': return 'list-received-public-events-for-user'
    case 'GET /orgs/:org/blocks/:username': return 'check-blocked-user'
    case 'GET /networks/:owner/:repo/events': return 'list-public-events-for-repo-network'
    case 'GET /marketplace_listing/stubbed/accounts/:id': return 'check-listing-for-account-stubbed'
    case 'GET /marketplace_listing/accounts/:id': return 'check-listing-for-account'
    case 'GET /repos/:owner/:repo/issues/:number/labels': return 'list-labels-on-issue'
    case 'GET /apps/:app_slug': return 'get-by-slug'
  }

  // workaround for stats endpoints: deviate idName for path
  if (/\/stats\//.test(route)) {
    const statIdName = kebabCase(route.split(/\/stats\//)[1])
    return `get-${statIdName}-stats`
  }

  // add scope singular/plural variations to fillWords
  const scopeNameVariations = getVariations(endpoint.scope)
  const ignoreWords = fillWords.concat(scopeNameVariations)

  // const forContextReplaceRegex = new RegExp(`(user|organization) (${scopeNameVariations.join('|')})`, 'ig')
  const fillWordsRegex = new RegExp(`\\b(${ignoreWords.join('|')})\\b`, 'ig')
  const ignoreWordsAtEndRegex = new RegExp(`\\b(${ignoreWordsAtEnd.join('|')})\\s*$`, 'i')

  let idName = endpoint.name
    .replace(/\bin an?\b/, 'for')
    // .replace(forContextReplaceRegex, '$2 for $1')
    .replace(fillWordsRegex, '')
    .replace(ignoreWordsAtEndRegex, '')

  // some workarounds
  // idName = idName.replace(/for-and/, 'for')
  idName = idName.replace(/'s/, '')

  idName = kebabCase(idName)

  // shorter aliases
  idName = idName
    .replace('organization', 'org')
    .replace('repository', 'repo')
    .replace('repositories', 'repos')
    .replace('reference', 'ref')
    .replace('references', 'refs')

  // workaround for https://developer.github.com/v3/apps/#find-installations
  // "Find" is used only here, everywhere else it’s "list"
  idName = idName.replace(/^find-installations$/, 'list-installations')

  // workaround for https://developer.github.com/v3/gitignore/#listing-available-templates
  idName = idName.replace(/^listing-/, 'list-')

  // workaround for stubbed Marketplace endpoints such as
  // https://developer.github.com/v3/apps/marketplace/#list-all-plans-for-your-marketplace-listing
  idName = idName.replace(/for-stubbed$/, 'stubbed')

  // workaround for https://developer.github.com/v3/activity/notifications/#view-a-single-thread
  idName = idName.replace(/^view\b/, 'get')

  // user's membership -> membership
  idName = idName.replace(/user-membership/, 'membership')

  // user-(as|is)-collaborator => collaborator
  idName = idName.replace(/user-(as|is)-collaborator/, 'collaborator')

  // check-if-collaborator -> check-collaborator
  idName = idName.replace(/^check-if/, 'check')

  // sha-1 -> sha
  idName = idName.replace(/\bsha-1/, 'sha')

  // create tag object -> create tag
  // create tag name -> create tag
  idName = idName.replace(/tag-(object|name)/, 'tag')

  // email addresses -> email
  idName = idName.replace(/email-address-?es/, 'emails')
  idName = idName.replace(/email-address/, 'email')

  // performed by -> for
  idName = idName.replace(/performed-by/, 'for')

  idName = idName.replace(/contextual-information/, 'context')

  // get-admin-enforcement-of-protected-branch -> get-protected-branch-admin-enforcement
  if (/-of-/.test(idName)) {
    const parts = idName.split(/-of-/)
    idName = parts[0].replace(/-/, `-${parts[1]}-`)
  }

  if (endpoint.scope === 'users' && /^\/users\/:username\//.test(endpoint.path)) {
    // user is special because some APIs are for the currently authenticated
    // user while others are APIs that require a username parameter. For examples
    // "list-followers" is the idName to list followers for the currently
    // authenticated user while "list-followers-for-user" is the idName to
    // list followers for a given username. So we don’t want to add back "for user"
    // to the idName.
    idName += '-for-user'
  }

  if (/^\/user\//.test(endpoint.path)) {
    // opposite from the above. By default requests are for the currently authenticated user
    idName = idName.replace(/-for-user$/, '')
  }

  // legacy endpoints
  if (/legacy/.test(endpoint.path)) {
    idName += '-legacy'
  }

  return idName
}

function getVariations (word) {
  const variations = [
    pluralize(word),
    pluralize.singular(word)
  ]

  if (word === 'apps') {
    variations.unshift('marketplace listing', 'marketplace listings')
  }

  if (word === 'checks') {
    variations.unshift('check run', 'check runs')
  }

  if (word === 'codesOfConduct') {
    variations.unshift('a repository\'s code of conduct')
    variations.unshift('code of conduct', 'codes of conduct')
  }

  if (word === 'oauthAuthorizations') {
    variations.unshift('authorization', 'authorizations')
    variations.unshift('application', 'applications')
    variations.unshift('app', 'apps')
  }

  if (word === 'orgs') {
    variations.unshift('organization', 'organizations')
  }

  if (word === 'pulls') {
    variations.unshift('pull request', 'pull requests')
  }

  if (word === 'repos') {
    variations.unshift('repository', 'repositories')
  }

  return variations
}

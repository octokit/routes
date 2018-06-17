module.exports = {
  // https://developer.github.com/v3/issues/labels/#update-a-label
  'PATCH /repos/:owner/:repo/labels/:name': 'PATCH /repos/:owner/:repo/labels/:oldname',
  // https://developer.github.com/v3/apps/#list-installations-for-user
  'GET /user/installations?access_token=...': 'GET /user/installations',
  // https://developer.github.com/v3/scim/#get-a-list-of-provisioned-identities
  'GET https://api.github.com/scim/v2/organizations/:organization/Users': 'GET /scim/v2/organizations/:organization/Users',
  // https://developer.github.com/v3/apps/#find-user-installation
  'GET /users/:user/installation': 'GET /users/:username/installation'
}

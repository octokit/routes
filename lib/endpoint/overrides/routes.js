module.exports = {
  'PATCH /repos/:owner/:repo/labels/:name': 'PATCH /repos/:owner/:repo/labels/:oldname',
  'GET /gitignore/templates/C': 'GET /gitignore/templates/:name',
  'POST https://<upload_url>/repos/:owner/:repo/releases/:id/assets?name=foo.zip': 'POST :url',
  'GET /user/installations?access_token=...': 'GET /user/installations'
}

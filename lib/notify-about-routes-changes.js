module.exports = notifyAboutRoutesChanges

const execa = require('execa')
const ghGot = require('gh-got')

async function notifyAboutRoutesChanges (state, outOfDate) {
  const repoName = process.env.TRAVIS_REPO_SLUG
  const branchName = `cron/routes-changes/${new Date().toISOString().substr(0, 10)}`

  console.log('🤖  Routes changes detected in cron job. Creating pull request ...')

  // push changes back to GitHub
  await execa('git', ['checkout', '-b', branchName])
  await execa('git', ['add', 'cache'])
  await execa('git', ['commit', '-m', 'build: cache'])
  await execa('git', ['add', 'index.json', 'routes'])
  await execa('git', ['commit', '-m', 'build: routes'])
  await execa('git', ['push', `https://${process.env.GH_TOKEN}@github.com/gr2m/sandbox.git`, `HEAD:${branchName}`])
  await execa('git', ['checkout', '-'])

  // start pullrequest
  const {body} = await ghGot.post(`repos/${repoName}/pulls`, {
    token: process.env.GH_TOKEN,
    body: {
      title: `🤖🚨  ${outOfDate.length} changes in existing routes detected`,
      head: branchName,
      base: 'master',
      body: `Dearest humans,

  My friend Travis asked me to let you know that they found routes changes in their daily routine check.`
    }
  })

  console.log(`🤖  Pull request created: ${body.html_url}`)
}

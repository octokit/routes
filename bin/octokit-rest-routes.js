#!/usr/bin/env node

const checkOrUpdateRoutes = require('../lib/check-or-update-routes')

const { cached, urls, _: [command] } = require('yargs')
  .command('update', 'Update route files', yargs => {
    yargs
      .options({
        'cached': {
          describe: 'Load HTML from local cache',
          type: 'boolean',
          default: false
        }
      })
      .example('$0 update https://developer.github.com/v3/git/commits/#create-a-commit --cached')
  })
  .command('check [urls..]', 'Check if route files are up-to-date', yargs => {
    yargs
      .positional('urls...', {
        describe: 'Optional selected REST API documentation URLs to check'
      })
      .options({
        'cached': {
          describe: 'Load HTML from local cache',
          type: 'boolean',
          default: false
        }
      })
      .example('$0 check https://developer.github.com/v3/git/commits/#create-a-commit --cached')
  })
  .help('h')
  .alias('h', ['help', 'usage'])
  .demandCommand(1, '')
  .usage('octokit-rest-routes.js <command> --usage')
  .argv

if (!['update', 'check'].includes(command)) {
  console.log(`"${command}" must be one of: update, check`)
  process.exit(1)
}

checkOrUpdateRoutes({ cached, urls, checkOnly: command === 'check' })
  .catch(error => {
    console.log(error.stack)
    process.exit(1)
  })

#!/usr/bin/env node

const checkOrUpdateRoutes = require('../lib/notify-about-routes-changes')

checkOrUpdateRoutes({
  repoSlug: process.env.GITHUB_REPOSITORY,
  token: process.env.GITHUB_TOKEN
})

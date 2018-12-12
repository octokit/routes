#!/usr/bin/env node

const checkOrUpdateRoutes = require('../lib/notifiy-about-changes')

checkOrUpdateRoutes({
  repoSlug: process.env.TRAVIS_REPO_SLUG,
  token: process.env.GH_TOKEN
})

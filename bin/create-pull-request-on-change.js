#!/usr/bin/env node

const notifyAboutRoutesChanges = require("../lib/notify-about-routes-changes");

if (!process.env.GITHUB_REPOSITORY) {
  console.log(
    `GITHUB_REPOSITORY environment variable is missing. Must be the full name of a repository, such as "octokit/hello-world"`
  );
  process.exit(1);
}
if (!process.env.GITHUB_TOKEN) {
  console.log(
    `GITHUB_TOKEN environment variable is missing. Must be an installation access token with code write permission`
  );
  process.exit(1);
}

notifyAboutRoutesChanges({
  repoSlug: process.env.GITHUB_REPOSITORY,
  token: process.env.GITHUB_TOKEN,
});

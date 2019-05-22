# workflow "Test on push" {
workflow "Deploy on push" {
  on = "push"
  resolves = ["remove older deployments"]
}

action "npm ci" {
  uses = "docker://timbru31/node-alpine-git"
  runs = "npm"
  args = "ci"
}

action "lint" {
  needs = "npm ci"
  uses = "docker://timbru31/node-alpine-git"
  runs = "npx"
  args = "standard"
}

action "routes:lint" {
  needs = "npm ci"
  uses = "docker://timbru31/node-alpine-git"
  runs = "npm"
  args = "run routes:lint"
}

action "test" {
  needs = [
    "lint",
    "routes:lint"
  ]
  uses = "docker://timbru31/node-alpine-git"
  runs = "npm"
  args = "run test:ci"
}

action "debug" {
  uses = "docker://timbru31/node-alpine-git"
  runs = "node"
  args = "-p 'process.env.NOW_TOKEN.substr(0, 5)'"
  secrets = ["NOW_TOKEN"]
}


action "deploy to now" {
  needs = [
    "debug",
    "routes:lint"
  ]
  uses = "docker://timbru31/node-alpine-git"
  runs = "npx"
  args = "now deploy --token $NOW_TOKEN"
  secrets = ["NOW_TOKEN"]
}

action "alias deploy domain" {
  needs = [
    "deploy to now"
  ]
  uses = "docker://timbru31/node-alpine-git"
  runs = "npx"
  args = "now alias --token $NOW_TOKEN"
  secrets = ["NOW_TOKEN"]
}

action "remove older deployments" {
  needs = [
    "deploy to now"
  ]
  uses = "docker://timbru31/node-alpine-git"
  runs = "npx"
  args = "now rm --safe --yes octokit-routes-openapi --token $NOW_TOKEN"
  secrets = ["NOW_TOKEN"]
}

workflow "Record on demand" {
  on = "repository_dispatch"
  resolves = ["routes update pull request"]
}

workflow "Cron" {
  on = "schedule(0 2 * * *)"
  resolves = ["routes update pull request"]
}

action "clear routes" {
  needs = "record action only"
  uses = "docker://timbru31/node-alpine-git"
  runs = "rm"
  args = "-rf routes cache"
}

action "update .com routes" {
  needs = [
    "clear routes",
    "npm ci"
  ]
  uses = "docker://timbru31/node-alpine-git"
  runs = "bin/octokit-rest-routes.js"
  args = "update"
}

action "update GHE routes" {
  needs = [
    "clear routes",
    "npm ci"
  ]
  uses = "docker://timbru31/node-alpine-git"
  runs = "bin/octokit-rest-routes.js"
  args = "update --ghe"
}

# git email/name must be configured, see https://github.com/octokit/routes/issues/438
action "config git email" {
  needs = [
    "update .com routes",
    "update GHE routes"
  ]
  uses = "docker://timbru31/node-alpine-git"
  runs = "git config --global user.email 'octokitbot@martynus.net'"
}

action "config git name" {
  needs = "config git email"
  uses = "docker://timbru31/node-alpine-git"
  runs = "git config --global user.name 'OctokitBot'"
}

action "routes update pull request" {
  needs = "config git name"
  uses = "docker://timbru31/node-alpine-git"
  runs = "bin/create-pull-request-on-change.js"
  secrets = ["GITHUB_TOKEN"]
}

workflow "Release" {
  on = "push"
  resolves = ["semantic-release"]
}

action "master branch only" {
  uses = "actions/bin/filter@master"
  args = "branch master"
}

action "npm ci (release)" {
  needs = "master branch only"
  uses = "docker://timbru31/node-alpine-git"
  runs = "npm"
  args = "ci"
}

action "semantic-release" {
  needs = [
    "master branch only",
    "npm ci (release)"
  ]
  uses = "docker://timbru31/node-alpine-git"
  runs = "npm"
  args = "run semantic-release"
  secrets = ["GITHUB_TOKEN", "NPM_TOKEN"]
}

workflow "Test on push" {
  on = "push"
  resolves = ["npm test"]
}

action "npm ci" {
  uses = "docker://node:alpine"
  runs = "npm"
  args = "ci"
}

action "lint" {
  needs = "npm ci"
  uses = "docker://node:alpine"
  runs = "npx"
  args = "standard"
}

action "npm test" {
  needs = "lint"
  uses = "docker://node:alpine"
  runs = "npm"
  args = "test --ignore-scripts"
}

workflow "Record" {
  on = "repository_dispatch"
  resolves = ["routes update pull request"]
}

action "record action only" {
  uses = "actions/bin/filter@master"
  args = "action record"
}

action "clear routes" {
  needs = "record action only"
  uses = "docker://node:alpine"
  runs = "rm"
  args = "-rf routes cache"
}

action "update dotcom routes" {
  needs = "clear routes"
  uses = "docker://node:alpine"
  runs = "bin/octokit-rest-routes.js"
  args = "update"
}

action "update GHE routes" {
  needs = "clear routes"
  uses = "docker://node:alpine"
  runs = "bin/octokit-rest-routes.js"
  args = "update --ghe"
}

action "routes update pull request" {
  needs = [
    "update dotcom routes",
    "clear routes"
  ]
  uses = "docker://node:alpine"
  runs = "bin/create-pull-request-on-change.js"
  secrets = ["GITHUB_TOKEN"]
}

workflow "Test on push" {
  on = "push"
  resolves = ["npm test"]
}

action "npm ci" {
  uses = "docker://node:alpine"
  runs = "npm"
  args = "ci"
}

action "npm run lint" {
  needs = "npm ci"
  uses = "docker://node:alpine"
  runs = "npm"
  args = "run lint"
}

action "npm test" {
  needs = "npm run lint"
  uses = "docker://node:alpine"
  runs = "npm"
  args = "test --ignore-scripts"
}

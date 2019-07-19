# Contributing

Thanks for wanting to contribute to Octokit Routes. We welcome your help.
For contributions of any kind we ask you to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

A general overview of how Octokit Routes work, have a look at the
[How it works](README.md#how-it-works) section in the README.

The most common issue people will run into is an unexpected route definition.
Please follow these steps to report such a problem

1. [Create an issue](https://github.com/octokit/routes/issues/new). Follow the instructions in the `<!-- comments -->`
2. If you would like to work resolving this issue, let us know :)
   Otherwise you are done here, thank you!
3. Fork the repository. Clone it to your computer and run the tests to make sure that everything works as expected.
4. Edit the `openapi/[api]/operations/[scope]/[operationId].json` file to what is expected from the issue
5. Run the tests, they should fail now
6. Commit the change with `test: ...` and start a pull request.
7. Let us know if you’d like to work on resolving the failing test.
   Otherwise you are done here, thank you, this is really great!
8. Figure out how to make your failing test pass. You can run a test for just the operation you edited, based on its documentation URL, by running:

   ```bash
   $ TEST_URL=https://developer.github.com/v3/repos/#get ./node_modules/.bin/tap test/integration/endpoints-test.js
   ```

   and for GitHub Enterprise:

   ```bash
   $ GHE_VERSION=2.17 TEST_URL=https://developer.github.com/enterprise/2.17/v3/repos/#get ./node_modules/.bin/tap test/integration/endpoints-test.js
   ```

   Once it's passing, push your changes and wait for us to review. If you have any questions at any point, comment on the pull request, we are happy to help you out.
9. Now you are more than awesome, thank you so much! 💐

## Merging the Pull Request & releasing a new version

Releases are automated using [semantic-release](https://github.com/semantic-release/semantic-release).
The following commit message conventions determine which version is released:

1. `fix: ...` or `fix(scope name): ...` prefix in subject: bumps fix version, e.g. `1.2.3` → `1.2.4`
2. `feat: ...` or `feat(scope name): ...` prefix in subject: bumps feature version, e.g. `1.2.3` → `1.3.0`
3. `BREAKING CHANGE: ` in body: bumps breaking version, e.g. `1.2.3` → `2.0.0`

Only one version number is bumped at a time, the highest version change trumps the others.

Besides publishing a new version to npm, semantic-release also creates a git tag and release on GitHub, generates changelogs from the commit messages and puts them into the release notes.

If the pull request looks good but does not follow the commit conventions, use the "Squash & merge" button.

# Contributing

Thanks for wanting to contribute to the Octokit Fixtures, we welcome your help.
For contributions of any kind we ask you to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

A general overview of how Octokit Routes work, have a look at the
[How it works](README.md#how-it-works) section in the README.

The most common issue people will run into is an unexpected route definition.
Please follow these steps to report such a problem

1. [Create an issue](https://github.com/octokit/routes/issues/new). Follow the instructions in the `<!-- comments -->`
2. If you would like to work resolving this issue, let us know :)
   Otherwise you are done here, thank you!
3. Fork the repository. Clone it to your computer and run the tests to make sure
   that everything works as expected.
4. Edit the `*.json` file to to what is expected from the issue
5. Run the tests, they should fail now
6. Commit the change with `test: ...` and start a pull request.
7. Let us know if you’d like to work on resolving the failing test. Otherwise
   you are done here, thank you, this is really great!
8. Figure out how to make your failing test pass. You can run a test for only
   `*.json` file you edited based on the documentation URL by running e.g.

   ```
   TEST_URL=https://developer.github.com/v3/repos/#get ./node_modules/.bin/tap test/integration/single-endpoint-test.js
   ```

   Once you did, push your changes and wait for us to review. If you have any
   questions at any point, comment on the pull request, we are happy to help you out.
9. Now you are more than awesome, thank you so much! 💐

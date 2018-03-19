# Contributing

Thanks for wanting to contribute to the Octokit Fixtures, we welcome your help.
For contributions of any kind we ask you to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

A general overview of how Octokit Routes work, have a look at the
[How it works](README.md#how-it-works) section in the README.

The most common issue people will run into is an unexpected route definition.
Please follow these steps to report such a problem

1. Create an issue. Mention
   1. the scope (e.g. "Users")
   2. the name (e.g. "Get the authenticated user")
   3. route (e.g. `GET /user`)
   4. the documentation URL
   5. A link to the current specification, e.g. https://github.com/octokit/routes/blob/90063204eeb08b16bcabd2b8563652197f2819c3/routes/users/get-the-authenticated-user.json (open the `*.json` in your browser and press `y` to get the permalink).
   6. A summary of what you expected instead
   7. The full JSON of what you expected instead
2. If you would like to work resolving this issue, let us know :)
   Otherwise you are done here, thank you!
3. Fork the repository. Clone it to your computer and run the tests to make sure
   that everything works as expected.
4. Edit the `*.json` file to to what you expected
5. Edit [test/integration/endpoints-test.js](test/integration/endpoints-test.js)
   and add the full URL of the documentation (including the `#anchor`) to the
   `URLS` array. Run the tests, they should fail now
6. Commit the change with `test: ...` and start a pull request.
7. Let us know if you’d like to work on resolving the failing test. Otherwise
   you are done here, thank you, this is really great!
8. Figure out how to make your failing test pass. Once you did, push your
   changes and wait for us to review. If you have any questions at any point,
   comment on the pull request, we are happy to help you out.
9. Now you are more than awesome, thank you so much! 💐

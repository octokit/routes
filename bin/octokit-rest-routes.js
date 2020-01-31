#!/usr/bin/env node

const checkOrUpdateRoutes = require("../lib/check-or-update-routes");

const options = {
  cached: {
    describe: "Load HTML from local cache",
    type: "boolean",
    default: false
  },
  ghe: {
    describe:
      'GitHub Enterprise. To load a specific version set it the version, e.g. "2.20"',
    type: "string"
  }
};

const {
  cached,
  urls,
  ghe,
  _: [command]
} = require("yargs")
  .command("update [urls..]", "Update route files", yargs => {
    yargs
      .positional("urls...", {
        describe: "Optional selected REST API documentation URLs to check"
      })
      .options(options)
      .example(
        "$0 update https://developer.github.com/v3/git/commits/#create-a-commit --cached"
      );
  })
  .command("check [urls..]", "Check if route files are up-to-date", yargs => {
    yargs
      .positional("urls...", {
        describe: "Optional selected REST API documentation URLs to check"
      })
      .options(options)
      .example(
        "$0 check https://developer.github.com/v3/git/commits/#create-a-commit --cached"
      );
  })
  .help("h")
  .alias("h", ["help", "usage"])
  .demandCommand(1, "")
  .usage("octokit-rest-routes.js <command> --usage").argv;

if (!["update", "check"].includes(command)) {
  console.log(`"${command}" must be one of: update, check`);
  process.exit(1);
}

checkOrUpdateRoutes({
  cached,
  urls,
  ghe,
  checkOnly: command === "check"
}).catch(error => {
  console.log(error.stack);
  process.exit(1);
});

module.exports = notifyAboutRoutesChanges;

const execa = require("execa");
const ghGot = require("gh-got");

async function notifyAboutRoutesChanges({ repoSlug, token }) {
  console.log("🤖  Checking for route changes ...");

  const branchName = `cron/routes-changes/${new Date()
    .toISOString()
    .substr(0, 10)}`;

  // check if any routes files have been changed
  const { stdout } = await execa("git", ["status", "openapi"]);
  if (/nothing to commit/.test(stdout)) {
    console.log("🤖  No changes found.");
    return;
  }

  console.log(
    "🤖  Routes changes detected in cron job. Creating pull request ..."
  );

  // count changes
  const { stdout: diffResult } = await execa(
    "git",
    ["diff", "--stat openapi/*/*/"],
    { shell: true }
  );

  const changesSummary = diffResult
    .split("\n")
    .pop()
    .trim()
    .replace(/file/, "operation");

  const { stdout: listOfChangedFiles } = await execa(
    "git",
    ["diff", "--name-only openapi/*/*/"],
    { shell: true }
  );
  const listOfChangedFilesString = listOfChangedFiles
    .split(/\n/)
    .map(line => "- " + line)
    .join("\n");

  // push changes back to GitHub
  await execa("git", ["checkout", "-b", branchName], { shell: true });
  await execa("git", ["add", "cache"], { shell: true });
  await execa("git", ["commit", "-m", "'build: cache'"], { shell: true });
  await execa("git", ["add", "openapi"], { shell: true });
  await execa(
    "git",
    [
      "commit",
      "-m",
      "'WIP openapi - review changes and set semantic commit message accordingly'"
    ],
    { shell: true }
  );
  await execa(
    "git",
    [
      "push",
      `https://x-access-token:${token}@github.com/${repoSlug}.git`,
      `HEAD:${branchName}`
    ],
    { shell: true }
  );
  await execa("git", ["checkout", "-"], { shell: true });

  // start pullrequest
  const { body } = await ghGot.post(`repos/${repoSlug}/pulls`, {
    token,
    body: {
      title: `🤖🚨 ${changesSummary}`,
      head: branchName,
      base: "master",
      body: `Dearest humans,

I found changes in the following operations, please have a look:

${listOfChangedFilesString}`
    }
  });

  console.log(`🤖  Pull request created: ${body.html_url}`);
}

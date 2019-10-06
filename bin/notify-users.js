const APP_ID = 37848;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const EVENT_TYPE = process.env.INPUT_EVENT_TYPE;
const VERSION = process.env.INPUT_VERSION;

const { createAppAuth } = require("@octokit/auth-app");
const { Octokit } = require("@octokit/core");

main();

async function main() {
  try {
    const auth = createAppAuth({
      id: APP_ID,
      privateKey: PRIVATE_KEY
    });
    const octokit = new Octokit({
      auth
    });

    // TODO: paginate
    const { data: installations } = await octokit.request(
      "GET /app/installations",
      { mediaType: { previews: ["machine-man"] }, per_page: 100 }
    );

    for (const {
      id,
      account: { login }
    } of installations) {
      console.log("Installation found: %s (%d)", login, id);

      const { token } = await auth({
        type: "installation",
        installationId: id
      });

      const installationOctokit = new Octokit({
        auth: token
      });

      // TODO: paginate
      const {
        data: { repositories }
      } = await installationOctokit.request("GET /installation/repositories", {
        mediaType: { previews: ["machine-man"] },
        per_page: 100
      });
      console.log(
        "Repositories found on %s: %d. Dispatching events",
        login,
        repositories.length
      );

      for (const { name, full_name } of repositories) {
        await installationOctokit.request(
          "POST /repos/:owner/:repo/dispatches",
          {
            mediaType: {
              previews: ["everest"]
            },
            owner: login,
            repo: name,
            event_type: EVENT_TYPE,
            client_payload: {
              version: VERSION.substr(1) // v24.1.2 -> 24.1.2
            }
          }
        );
        console.log("Event distpatched for %s", full_name);
      }
    }
  } catch (error) {
    console.log(error);
    throw error;
  }
}

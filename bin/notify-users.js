const { createAppAuth } = require("@octokit/auth-app");
const { Octokit } = require("@octokit/core");
const { paginateRest } = require("@octokit/plugin-paginate-rest");

const APP_ID = 37848;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const EVENT_TYPE = "octokit-routes-release";
const VERSION = process.env.VERSION.substr(1);

const OctokitWithPagination = Octokit.plugin(paginateRest);

main();

async function main() {
  try {
    const octokit = new OctokitWithPagination({
      auth: {
        id: APP_ID,
        privateKey: PRIVATE_KEY,
      },
      authStrategy: createAppAuth,
    });

    const installations = await octokit.paginate("GET /app/installations", {
      mediaType: { previews: ["machine-man"] },
      per_page: 100,
    });

    for (const {
      id,
      account: { login },
    } of installations) {
      console.log("Installation found: %s (%d)", login, id);

      const installationOctokit = new OctokitWithPagination({
        auth: {
          id: APP_ID,
          privateKey: PRIVATE_KEY,
          installationId: id,
        },
        authStrategy: createAppAuth,
      });

      const repositories = await installationOctokit.paginate(
        "GET /installation/repositories",
        {
          mediaType: { previews: ["machine-man"] },
          per_page: 100,
        }
      );

      console.log(
        "Repositories found on %s: %d. Dispatching events",
        login,
        repositories.length
      );

      for (const { name, full_name } of repositories) {
        const options = installationOctokit.request.endpoint.merge(
          "POST /repos/:owner/:repo/dispatches",
          {
            owner: login,
            repo: name,
            event_type: EVENT_TYPE,
            client_payload: {
              version: VERSION,
            },
          }
        );
        console.log(options);

        await installationOctokit.request(options);
        console.log("Event distpatched for %s", full_name);
      }
    }
  } catch (error) {
    console.log(error);
    throw error;
  }
}

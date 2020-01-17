const { createAppAuth } = require("@octokit/auth-app");
const { Octokit } = require("@octokit/core");
const { paginateRest } = require("@octokit/plugin-paginate-rest");

const APP_ID = 37848;
const PRIVATE_KEY = `-----BEGIN RSA PRIVATE KEY-----
MIIEpQIBAAKCAQEA9hFfji8tcchyWD5yRU3GjURS1g8NtQhi1kIj/Dn7GJdz7Iey
z8ZWazoYizfmfIszG9PGOpZ51sa0O6tsd4fyBvoW9yCh1Cc0E1UXAHBBUdjUKdOm
p++1vRSUKpdDdiZR3nGn3PBGmu7VzcQtAB3C7WjTU4kOjKwZqXykxPtX9F6dwrXn
a33NOkGxZA36nWfjpRNl5jloep/J0+Tzsu0jRjtOmvd6k8uMYCsVvjQErpEEY4Bi
tusILq/8onTMzuIPVF9rTdWfcJTso/tkcQEc1zv9xeZJm52N7C7TXD9yEG3xCHrL
ng55BweB4cs+8GphaeCpiKfqZkAWcyOfeU0yuQIDAQABAoIBAQDXbChK0zSm24R3
itwBnnCINluK+YzXg2r8BtV4OM6CHf2oArjhu9LmdusL3rmTKU5qO0HdAuXRyQ36
+z2ve73Aq+u1GMV0dYnarvC/OoeE/x3nLFtHxM1Hpp98lgbChhPAeaIrA9PcSeG2
DdwTsPp5W/8+r8ukDfs9bVjW9vBuhzt2IgQmDbSv2W46ldx1hkFOvc6+DJl/J0XX
tann3TlovI5QkdALEXBfYwn1vP023WX8QKIZJCBWW91JcG8P+chaJxTcTTIdd9J/
cyAxT5o5ve1VqgK7QDDa04kJtri1Dmfnto5tIBY1XGxWfVN/NyeAqGlAQSClPeUa
9jxe0gydAoGBAP6ypiyDoABFZakbIL6YoK6GL+KHspLAkkUS+7HwUrM8y29lTmOE
i+Rh6x/c9tYM+ufqXx1eJ0mFLrxroeDIqI/9kNiDhqjnmgrVbg8mmv8PPRskmBn7
Zf/AHR+rFHkSWYMOz9SQKZ6SZbua7z1Jkq9DhDQcycZR7xb0g6FFsaerAoGBAPdT
bdxqAau3rqZ534AnertTLUm/zrID2UiO+d/mZnpYDiyr8JNSwlVnl8TCk8T88ekV
NmRPBfqpyh+tQ/4Wr2WBUDH6snzbWLKTon0Orp1rputJt6CU24CBXpgQIq0WjXwf
kufwWX+lQlKwGUEw29nlpYNqUDWM57EZo0sUVRsrAoGBAPWalk2km7zHLtIUO84v
ZfsFoNVkH1oOYr5DIP0kjssSW+ZOnXmvzipsFgyCym/80lKjGhc6vM3TpQ7DB7W4
KXu4e12d71OfCldaGqh3hM1iB33OGvIrD9/AhRUNp09c135e4SDL56Zm670uGXdT
JCToCWsrO5OHXPQY03nHuBnDAoGBAIoGN0NQrYoFQiSJ0x8T6TxtWNLVhiZ2W2ZQ
1EYNsJcKWS647dNp1iYPX/VgmVLPzrlDK02jhDS1WKWA7nb4df3xwq2BuOZRCxjt
pzqfXPdhQpAAXcfyCuWWTRITvyZVdbQVcsiZq3i+41p+CDoHaEocDNhgFk8sSYje
Q/D8cdptAoGAQvctoIw+yjnK18uA/6vac5iQpBgm5KDWn/051Jg8ZHxsVLrR77hK
7ptwuLW+eN4IeNm+vqObmq4Ss4wauJy2TUTHMEA7uGFSjdAUe0QHMaPlvOGxUuM+
Na78jB0jc4pwGJMJMN9Wn75n4kBw6LbRYL6eX1/TYDNxNSj/z2fdqBo=
-----END RSA PRIVATE KEY-----
`;
const EVENT_TYPE = "octokit-routes-release";
const VERSION = require("../package.json").version;

if (VERSION === "0.0.0-development") {
  throw new Error(
    'Set correct version to be dispatched in package.json. Will not dispatch "0.0.0-development"'
  );
}

const OctokitWithPagination = Octokit.plugin(paginateRest);

main();

async function main() {
  try {
    const octokit = new OctokitWithPagination({
      auth: {
        id: APP_ID,
        privateKey: PRIVATE_KEY
      },
      authStrategy: createAppAuth
    });

    const installations = await octokit.paginate("GET /app/installations", {
      mediaType: { previews: ["machine-man"] },
      per_page: 100
    });

    for (const {
      id,
      account: { login }
    } of installations) {
      console.log("Installation found: %s (%d)", login, id);

      const installationOctokit = new OctokitWithPagination({
        auth: {
          id: APP_ID,
          privateKey: PRIVATE_KEY,
          installationId: id
        },
        authStrategy: createAppAuth
      });

      const repositories = await installationOctokit.paginate(
        "GET /installation/repositories",
        {
          mediaType: { previews: ["machine-man"] },
          per_page: 100
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
            mediaType: {
              previews: ["everest"]
            },
            owner: login,
            repo: name,
            event_type: EVENT_TYPE,
            client_payload: {
              version: VERSION
            }
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

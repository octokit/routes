module.exports = htmlToJson;

const cheerio = require("cheerio");
const { URL } = require("url");

const { getScope } = require("../openapi");
const addCodeSamples = require("./add-code-samples");
const addTriggersNotificationFlag = require("./add-triggers-notification-flag");
const applyDeprecations = require("./overrides/deprecations");
const elementToBlock = require("./element-to-block");
const findAcceptHeader = require("./find-accept-header");
const findDescription = require("./find-description");
const findExamples = require("./find-examples");
const findIsGitHubCloud = require("./find-is-github-cloud");
const findParameters = require("./find-parameters");
const findPreviews = require("./find-previews");
const findResponses = require("./find-responses");
const findRoutes = require("./find-routes");
const findDeprecationNotices = require("./find-deprecation-notices");
const htmlContainsEndpoint = require("./html-contains-endpoint");
const workarounds = require("./overrides/workarounds");

async function htmlToJson(
  html,
  { baseUrl, serverUrl, gheVersion, documentationUrl }
) {
  if (!htmlContainsEndpoint(html)) {
    return;
  }

  const $ = cheerio.load(html);
  const [pageUrl, pageFragment] = documentationUrl.split("#");
  const pageOrigin = pageUrl.replace(new URL(pageUrl).pathname, "");
  const state = {
    baseUrl,
    serverUrl,
    gheVersion,
    pageOrigin,
    pageUrl,
    pageFragment,
    routes: [{}],
    blocks: $("body > *")
      .map((i, el) => {
        const block = elementToBlock(el);

        if (!block) {
          throw new Error(
            "Could not identify block type for:\n" + cheerio.html(el)
          );
        }

        return block;
      })
      .get()
  };

  // first block is always the title block, which
  // also includes the "enabledForApps" flag
  const { text: summary, enabledForApps } = state.blocks[0];
  Object.assign(state.routes[0], {
    method: null,
    path: null,
    operation: {
      summary,
      description: null,
      operationId: null,
      tags: [getScope(documentationUrl)],
      externalDocs: {
        description: "API method documentation",
        url: documentationUrl
      },
      parameters: [],
      responses: {},
      "x-code-samples": [],
      "x-github": {
        legacy: false,
        enabledForApps,
        githubCloudOnly: false
      },
      "x-changes": []
    }
  });

  // remove title block so we can keep track of blocks we haven’t parsed yet
  state.blocks.splice(0, 1);

  // mutate results
  findIsGitHubCloud(state);
  findRoutes(state);
  findParameters(state);
  findAcceptHeader(state);
  findPreviews(state);
  findDescription(state);
  findResponses(state);
  findExamples(state);
  findDeprecationNotices(state);
  addTriggersNotificationFlag(state);
  workarounds(state);
  addCodeSamples(state);
  applyDeprecations(state);

  return state.routes;
}

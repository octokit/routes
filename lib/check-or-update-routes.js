module.exports = checkOrUpdateRoutes;

const { resolve: pathResolve, join: joinPaths } = require("path");

const _ = require("lodash");
const { writeFile, ensureFile, remove } = require("fs-extra");
const prettier = require("prettier");

const Cache = require("./cache");
const getEndpoint = require("./endpoint/get");
const getGheVersions = require("./get-ghe-versions");
const parseUrlsOption = require("./options/urls");
const { getScope, getIdName } = require("./openapi");

async function checkOrUpdateRoutes(options) {
  if (!options.urls && !options.cached) {
    console.log("🔍  Looking for URLs (this might take a while)");
  }

  const [baseUrl, folderName] = options.ghe
    ? [
        `https://developer.github.com/enterprise/${options.ghe}/v3/`,
        `ghe-${options.ghe}`
      ]
    : ["https://developer.github.com/v3/", "api.github.com"];

  const state = {
    baseUrl,
    folderName,
    cache: new Cache(folderName),
    memoryCache: {},
    checkOnly: options.checkOnly,
    cached: options.cached,
    gheVersion: parseFloat(options.ghe)
  };

  if (options.ghe === "") {
    console.log("ℹ️  Loading GitHub Enterprise versions");
    const gheVersions = await getGheVersions(state);

    for (let index = 0; index < gheVersions.length; index++) {
      const ghe = gheVersions[index];
      console.log(`ℹ️  Updating routes for GitHub Enterprise ${ghe}`);
      await checkOrUpdateRoutes({
        ...options,
        ghe
      });
    }

    return;
  }

  const urls = await parseUrlsOption(state, options.urls);
  console.log(`🤖  Looking for sections at ${urls.length} URLs`);

  const routes = [];
  await urls.reduce(async (promise, url) => {
    await promise;

    console.log(`🌐  ${url}`);
    const endpoints = await getEndpoint(state, url);

    if (!endpoints) {
      console.log("ℹ️  No endpoints");
      return;
    }

    routes.push(...endpoints);
  }, null);

  console.log("");
  console.log("🏁  done");

  const mainSchemaFileRelativePath = joinPaths(
    "../openapi",
    state.gheVersion ? `ghe-${state.gheVersion}` : "api.github.com"
  );
  const mainSchema = require(mainSchemaFileRelativePath);

  const mainSchemaFilePath = require.resolve(mainSchemaFileRelativePath);
  const operationsDir = pathResolve(mainSchemaFilePath, "..", "operations");

  // delete all existing operations unless specific URLs were passed as CLI arguments
  if (!options.urls) {
    mainSchema.paths = {};
    await remove(operationsDir);
  }

  routes.forEach(async route => {
    const { operation } = route;
    const method = route.method.toLowerCase();
    let path = route.path.replace(/:(\w+)/g, "{$1}");
    const scope = getScope(operation.externalDocs.url);
    const idName = getIdName(route, scope);

    // TODO: handle "Identical path templates detected" error
    if (
      ["/repos/{owner}/{repo}/git/refs/{namespace}", "{url}"].includes(path)
    ) {
      return;
    }

    // Workaround for "Upload a release asset"
    if (
      path ===
      "{server}/repos/{owner}/{repo}/releases/{release_id}/assets{?name,label}"
    ) {
      path = "/repos/{owner}/{repo}/releases/{release_id}/assets";
    }

    _.set(mainSchema.paths, `["${path}"].${method}`, {
      $ref: `operations/${scope}/${idName}.json`
    });

    const operationFilePath =
      pathResolve(operationsDir, scope, idName) + ".json";
    await ensureFile(operationFilePath);
    await writeFile(
      operationFilePath,
      prettier.format(JSON.stringify(operation), { parser: "json" })
    );
  });

  // sort paths
  mainSchema.paths = _(mainSchema.paths)
    .toPairs()
    .sortBy(0)
    .fromPairs()
    .value();
  await writeFile(
    mainSchemaFilePath,
    prettier.format(JSON.stringify(mainSchema), { parser: "json" })
  );
}

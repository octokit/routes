const { entries, kebabCase } = require("lodash");

const getEndpoint = require("../lib/endpoint/get");

module.exports = {
  getAllRoutes,
  getAllRoutesByDocumentUrl,
  getAllDocumentationUrls,
  getScopeRoutes,
  getScopeRoutesByDocumentUrl,
  getRoutesForUrl,
  getGheVersion,
  getBaseUrl,
  getPathPrefix,
  getCacheDir,
  getRoutesRoot,
  getRoutesDir,
  getRouteMap
};

const TEST_URLS = process.env.TEST_URL
  ? process.env.TEST_URL.split(/\s*,\s/)
  : null;

if (TEST_URLS) {
  if (process.env.GHE_VERSION) {
    throw new Error("Do not specify TEST_URL and GHE_VERSION");
  }
  const firstUrlVersion = getGheVersionFromUrl(TEST_URLS[0]);
  for (const url of TEST_URLS) {
    if (getGheVersionFromUrl(url) !== firstUrlVersion) {
      throw new Error(
        "All TEST_URLs must be of the same GitHub Enterprise version"
      );
    }
  }
}

const GHE_VERSION =
  parseFloat(
    TEST_URLS ? getGheVersionFromUrl(TEST_URLS[0]) : process.env.GHE_VERSION
  ) || null;

function getGheVersionFromUrl(url) {
  return /(?:\/enterprise\/(\d+\.\d+))?\/v3\//i.exec(url)[1] || null;
}

function getGheVersion() {
  return GHE_VERSION;
}

function getBaseUrl() {
  const pathPrefix = getPathPrefix();
  return `https://developer.github.com/${pathPrefix}/`;
}

function getPathPrefix() {
  const gheVersion = getGheVersion();
  return gheVersion ? `enterprise/${gheVersion}/v3` : "v3";
}

function getCacheDir() {
  return getRoutesDir();
}

function getRoutesRoot() {
  return "openapi";
}

function getRoutesDir() {
  const gheVersion = getGheVersion();
  return gheVersion ? `ghe-${gheVersion}` : "api.github.com";
}

function requireRoutesFile(filePath) {
  const [routesRoot, routesDir] = [getRoutesRoot(), getRoutesDir()];
  return require(`../${routesRoot}/${routesDir}/${filePath}`);
}

function getAllRoutes() {
  return requireRoutesFile("index.json").paths;
}

const CACHED_ROUTES_BY_DOCUMENTATION_URL = entries(getAllRoutes()).reduce(
  reduceByDocumentationUrl,
  {}
);
function getAllRoutesByDocumentUrl() {
  return CACHED_ROUTES_BY_DOCUMENTATION_URL;
}

function getAllDocumentationUrls() {
  if (TEST_URLS) {
    return TEST_URLS;
  }

  return Object.keys(getAllRoutesByDocumentUrl());
}

function getScopeRoutes(scope) {
  const kebabScope = kebabCase(scope);
  return requireRoutesFile(`${kebabScope}.json`);
}

function getScopeRoutesByDocumentUrl(scope) {
  return getScopeRoutes(scope).reduce(reduceByDocumentationUrl, {});
}

function getRoutesForUrl(url) {
  return CACHED_ROUTES_BY_DOCUMENTATION_URL[url];
}

function reduceByDocumentationUrl(map, [path, methods]) {
  for (const method of Object.keys(methods)) {
    const operation = getOperation(method);
    const documentationUrl = operation.externalDocs.url;
    if (!map[documentationUrl]) {
      map[documentationUrl] = [];
    }
    map[documentationUrl].push({ path, method, operation });
  }
  return map;

  // TODO: make openapi operations more straightforward to include,
  //       probably via json-schema-ref-parser
  function getOperation(method) {
    let op = methods[method];
    // json-schema-ref-parser does not resolve relative to the index.json file.
    // For now use simple, manual $ref requiring:
    if (op.$ref) {
      const [routesRoot, routesDir] = [getRoutesRoot(), getRoutesDir()];
      op = require(`../${routesRoot}/${routesDir}/${op.$ref}`);
    }
    return op;
  }
}

async function getRouteMap(urls, state) {
  const allRoutes = [];
  const routeMap = new Map();

  await urls.reduce(async (promise, url) => {
    await promise;
    const routes = await getEndpoint(state, url);
    if (routes) {
      allRoutes.push(...routes);
      routeMap.set(url, routes);
    }
  }, null);

  for (const [url, routes] of routeMap) {
    const formattedRoutes = formatRoutes(routes, allRoutes);
    routeMap.set(url, formattedRoutes);
  }
  return routeMap;
}

function formatRoutes(routes, allRoutes) {
  const goodRoutes = routes.filter(discardBadRoutes);
  const formattedRoutes = [];
  for (const route of goodRoutes) {
    formattedRoutes.push(formatRoute(route, allRoutes));
  }
  return formattedRoutes;
}

function discardBadRoutes(route, i, routes) {
  // Avoid "Identical path templates detected" error
  if (
    [
      "/repos/{owner}/{repo}/labels/{current_name}",
      "/repos/{owner}/{repo}/git/refs/{namespace}",
      "{url}"
    ].includes(route.path)
  ) {
    return false;
  }

  // Discard all but the last one of routes that share the same method and path
  // because OpenAPI only supports one operation per method for each path
  // Only way to "fix" this is to change the actual GitHub API
  // As of 15 July 2019, the offenders are:
  //   - post /repos/{owner}/{repo}/pulls
  //     - pulls-create
  //     - pulls-create-from-issue
  //   - post /repos/{owner}/{repo}/pulls/{pull_number}/comments
  //     - pulls-create-comment
  //     - pulls-create-comment-reply
  return checkIfCanonicalOp();

  function checkIfCanonicalOp() {
    if (routes.length === 1) {
      return true;
    }
    let count = 0;
    let deprecatedCount = 0;
    let lastId;
    for (const _route of routes) {
      if (_route.path === route.path) {
        count++;
        _route.deprecated && deprecatedCount++;
        lastId = _route.operation.operationId;
      }
    }
    const hasUniquePath = count - deprecatedCount <= 1;
    // Last-in wins because there's not a better way
    const isCanonicalOpForNonUniquePath =
      route.operation.operationId === lastId;
    return hasUniquePath || isCanonicalOpForNonUniquePath;
  }
}

function formatRoute(route, allRoutes) {
  const path = route.path
    .split("/")
    .map(segment => segment.replace(/:(\w+)/g, "{$1}"))
    .join("/");
  const method = route.method.toLowerCase();
  return { path, method, operation: route.operation };
}

module.exports = getEndpoint;

const { existsSync } = require("fs");
const { join: joinPath } = require("path");
const { URL } = require("url");

const cheerio = require("cheerio");

const getHtml = require("../get-html");
const htmlToJson = require("./html-to-json");
const getApi = require("../openapi").getApi;

async function getEndpoint(state, url) {
  const [pageUrl, id] = url.split("#");
  const { pathname: pagePath } = new URL(url);

  // find manual overrides for GHE first, then for all versions
  const pageOverridePaths = [
    joinPath(
      __dirname,
      "overrides",
      `${pagePath.replace(`/enterprise/${state.gheVersion}/`, "/")}${id}.json`
    ),
  ];

  if (state.gheVersion) {
    pageOverridePaths.unshift(
      joinPath(__dirname, "overrides", `${pagePath}${id}.json`)
    );
  }

  const pageOverridePath = pageOverridePaths.find((path) => existsSync(path));

  const pageEndpointPath = `${pagePath}${id}.html`;
  let endpointHtml;

  if (pageOverridePath) {
    const routes = require(pageOverridePath);
    if (routes) {
      routes.forEach((route) => {
        // some descriptions have link to external docs
        route.operation.description = route.operation.description.replace(
          route.operation.externalDocs.url,
          url
        );
        route.operation.externalDocs.url = url;
        route.operation["x-github"].overridden = true;
      });
    }
    return routes;
  }

  if (state.cached && (await state.cache.exists(pageEndpointPath))) {
    endpointHtml = await state.cache.read(pageEndpointPath);
  } else {
    const pageHtml = await getHtml(state, pageUrl);
    const $ = cheerio.load(pageHtml);
    const $title = $(`#${id}`).closest("h1, h2");

    endpointHtml =
      $.html($title) +
      "\n" +
      $title
        .nextUntil("h1, h2")
        .map((i, el) => $.html(el))
        .get()
        .join("\n");

    await state.cache.writeHtml(pageEndpointPath, endpointHtml);
  }

  const serverUrl = require(`../../openapi/${getApi(
    state.gheVersion
  )}/index.json`).servers[0].url;
  const routes = await htmlToJson(endpointHtml, {
    baseUrl: state.baseUrl,
    serverUrl,
    gheVersion: state.gheVersion,
    documentationUrl: url,
  });
  return routes;
}

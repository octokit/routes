module.exports = parseUrlsOption;

const _ = require("lodash");

const getDocPages = require("../landing-page/get");
const getPageSections = require("../documentation-page/get");
const normalizeUrl = require("../normalize-url");

/**
 * returns all section URLs from all documentation pages by default
 * If URLs are passed than the page URLs are turned into their section URLs
 */
async function parseUrlsOption(state, urls) {
  if (!urls || urls.length === 0) {
    // get URLs for all sections across all pages
    const pages = await getDocPages(state);
    return (await pages.reduce(toSectionUrls.bind(null, state), [])).map(
      normalizeUrl
    );
  }

  const normalizedUrls = urls.map(normalizeUrl);
  const invalidUrls = normalizedUrls.filter(isntV3DocumentationUrl);
  if (invalidUrls.length) {
    throw new Error(`Invalid URLs: ${invalidUrls.join(", ")}`);
  }

  const pageUrls = normalizedUrls.filter(isPageUrl);

  const sectionUrls = normalizedUrls.filter(isSectionUrl);
  return _.uniq(
    (await pageUrls.reduce(toSectionUrls.bind(null, state), [])).concat(
      sectionUrls
    )
  );
}

function isntV3DocumentationUrl(url) {
  return !/^https:\/\/developer.github.com(\/enterprise\/[^/]+)?\/v3/.test(url);
}

function isSectionUrl(url) {
  return /#[a-z-]+$/.test(url);
}

function isPageUrl(url) {
  return !/#[a-z-]+$/.test(url);
}

async function toSectionUrls(state, promise, pageOrUrl) {
  const sectionUrls = await promise;
  const pageSections = await getPageSections(state, pageOrUrl.url || pageOrUrl);
  const urls = pageSections.map((section) => section.url);

  return sectionUrls.concat(urls);
}

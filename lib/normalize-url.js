module.exports = customNormalizeUrl;

const normalizeUrl = require("normalize-url");

// normalize-url does not remove trailing slash with {stripFragment: false}
function customNormalizeUrl(url) {
  const [urlWithoutFragment, fragment] = url.split("#");
  return [normalizeUrl(urlWithoutFragment) + "/", fragment]
    .filter(Boolean)
    .join("#");
}

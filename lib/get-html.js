module.exports = getHtml;

const { URL } = require("url");
const fetch = require("node-fetch");

async function getHtml(state, url) {
  const cacheFilePath = new URL(url).pathname + "/index.html";
  const memoryCached = state.memoryCache[url];

  if (memoryCached) {
    return memoryCached;
  }

  if (state.cached && (await state.cache.exists(cacheFilePath))) {
    state.memoryCache[url] = state.cache.read(cacheFilePath);
    return state.memoryCache[url];
  }

  console.log(`⌛  fetching ${url}`);

  // throttle requests to GitHub
  await new Promise(resolve => setTimeout(resolve, 1000));

  const html = await (await fetch(url)).text();
  await state.cache.writeHtml(cacheFilePath, html);
  state.memoryCache[url] = html;
  return html;
}

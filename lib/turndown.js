// We use "turndown" to convert HTML into Markdown
// https://www.npmjs.com/package/turndown#options
const turndownService = require("turndown")({
  codeBlockStyle: "fenced"
});
module.exports = turndownService.turndown.bind(turndownService);

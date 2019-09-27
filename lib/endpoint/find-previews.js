module.exports = findPreviews;

const normalizeMarkdown = require("../normalize-markdown");

function findPreviews(state) {
  const previewBlocks = state.blocks.filter(block => block.type === "preview");

  state.routes.forEach(route => {
    route.operation["x-github"].previews = previewBlocks.map(block => {
      return {
        name: block.preview,
        note: normalizeMarkdown(state, block.text).replace(
          /^\*\*Note:?\*\*\s+/,
          ""
        ),
        required: block.required
      };
    });
  });
}

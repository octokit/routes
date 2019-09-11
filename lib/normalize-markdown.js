module.exports = normalizeMarkdown;

function normalizeMarkdown(state, markdown) {
  return markdown
    .replace(/]\(\//g, `](${state.pageOrigin}/`)
    .replace(/]\(#/g, `](${state.pageUrl}#`);
}

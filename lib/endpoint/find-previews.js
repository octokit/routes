module.exports = findPreviews;

const normalizeMarkdown = require("../normalize-markdown");

function findPreviews(state) {
  const previewBlocks = state.blocks.filter(
    (block) => block.type === "preview"
  );

  state.routes.forEach((route) => {
    route.operation["x-github"].previews = previewBlocks.map((block) => {
      return {
        name: block.preview,
        required: block.required,
        note: normalizeMarkdown(state, block.text)
          .replace(/^\*\*Note:?\*\*\s+/, "")

          // remove extra leading and trailing newlines
          .replace(/```\n\n\n/gm, "```\n")
          .replace(/```\n\n/gm, "```\n")
          .replace(/\n\n\n```/gm, "\n```")
          .replace(/\n\n```/gm, "\n```")

          // use shell so it's not wrongly auto-detected as AppleScript
          .replace(/```\n/, "```shell\n")

          // convert single-backtick code snippets to fully fenced triple-backtick blocks
          // example: This is the description.\n\n`application/vnd.github.machine-man-preview+json`
          .replace(/\n`application/, "\n```\napplication")
          .replace(/json`$/, "json\n```")

          .trim(),
      };
    });
  });
}

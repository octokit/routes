module.exports = findAcceptHeader;

function findAcceptHeader(state) {
  const previewBlocks = state.blocks.filter(block => block.type === "preview");

  state.routes.forEach(route => {
    // TODO: handle optional preview blocks
    const requiredPreviewHeaderBlocks = previewBlocks.filter(
      block => block.required
    );
    const defaultAcceptHeader = requiredPreviewHeaderBlocks.length
      ? requiredPreviewHeaderBlocks
          .map(block => `application/vnd.github.${block.preview}-preview+json`)
          .join(",")
      : "application/vnd.github.v3+json";
    const acceptHeaderParam = {
      name: "accept",
      description: requiredPreviewHeaderBlocks.length
        ? "This API is under preview and subject to change."
        : "Setting to `application/vnd.github.v3+json` is recommended",
      in: "header",
      schema: {
        type: "string",
        default: defaultAcceptHeader
      }
    };

    if (requiredPreviewHeaderBlocks.length) {
      acceptHeaderParam.required = true;
    }

    route.operation.parameters.unshift(acceptHeaderParam);
  });
}

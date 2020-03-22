module.exports = findIsGitHubCloud;

function findIsGitHubCloud(state) {
  if (state.gheVersion) {
    return;
  }

  const githubCloudOnly = isGitHubCloud(state);

  state.routes.forEach((route) => {
    route.operation["x-github"].githubCloudOnly = githubCloudOnly;
  });
}

function isGitHubCloud(state) {
  const routeBlocks = state.blocks.filter((block) => block.type === "route");
  const scimRoute = routeBlocks.find((routeBlock) =>
    /^\/scim\//.test(routeBlock.path)
  );
  const teamSyncRoute = routeBlocks.find((routeBlock) =>
    /\/team-sync\//.test(routeBlock.path)
  );

  if (scimRoute || teamSyncRoute) {
    return true;
  }

  const description = state.blocks
    .filter((block) => block.type === "description")
    .map((block) => block.text)
    .join("\n\n");

  const resultWithGitHubEnterpriseNote = /is available to organizations with GitHub Enterprise Cloud/.test(
    description
  );

  return !!resultWithGitHubEnterpriseNote;
}

module.exports = findRespones;

const normalizeMarkdown = require("../normalize-markdown");
const { assignResponse } = require("../openapi");

function findRespones(state) {
  const responseTitleBlocks = state.blocks.filter(
    block => block.type === "responseTitle"
  );

  const responses = {};

  if (!responseTitleBlocks.length) {
    assignResponse(responses, 418);
    updateRoutes(state.routes, responses);
    return;
  }

  for (let i = 0; i < responseTitleBlocks.length; i++) {
    const nextBlockIdx = state.blocks.indexOf(responseTitleBlocks[i + 1]);
    const currentResponseBlocks = state.blocks.slice(
      state.blocks.indexOf(responseTitleBlocks[i]),
      nextBlockIdx === -1 ? Infinity : nextBlockIdx
    );

    findResponse(
      {
        ...state,
        blocks: currentResponseBlocks
      },
      responses
    );
  }

  if (Object.keys(responses).length === 0) {
    assignResponse(responses, 418);
  }
  updateRoutes(state.routes, responses);
}

function findResponse(state, responses) {
  const responseTitleBlock = state.blocks.find(
    block => block.type === "responseTitle"
  );

  if (!responseTitleBlock) {
    assignResponse(responses, 418);
    return;
  }

  let blocksAfterResponseTitle = state.blocks.slice(
    1 + state.blocks.indexOf(responseTitleBlock)
  );
  const titleAfterResponseTitle = blocksAfterResponseTitle.find(block =>
    /title$/i.test(block.type)
  );

  if (titleAfterResponseTitle) {
    blocksAfterResponseTitle = blocksAfterResponseTitle.slice(
      0,
      blocksAfterResponseTitle.indexOf(titleAfterResponseTitle)
    );
  }

  for (var i = 0; i < blocksAfterResponseTitle.length; i++) {
    const previousBlock = blocksAfterResponseTitle[i - 1] || {};
    const block = blocksAfterResponseTitle[i];
    const nextBlock = blocksAfterResponseTitle[i + 1] || {};

    let description =
      responseTitleBlock.text === "Response" ? null : responseTitleBlock.text;
    let body = null;

    if (block.type === "responseHeaders") {
      const statusCode = block.status;

      if (nextBlock.type === "response") {
        // temporary workaround for invalid response at https://developer.github.com/v3/teams/team_sync/#response-2
        if (
          state.routes[0].operation.summary ===
          "Create or update IdP group connections"
        ) {
          nextBlock.data = {
            groups: nextBlock.data.groups[0]
          };
        }

        body = nextBlock.data;
        i++;
      }

      if (previousBlock.type === "description") {
        description = normalizeMarkdown(state, previousBlock.text);
      }

      if (!responses[statusCode]) {
        assignResponse(responses, statusCode, description, body);
      }
      continue;
    }

    if (block.type === "response") {
      const previousBlock = blocksAfterResponseTitle[i - 1] || {};
      if (previousBlock.type === "description") {
        description = normalizeMarkdown(state, previousBlock.text);
      }
      assignResponse(responses, 200, description, block.data);
    }
  }
}

function updateRoutes(routes, responses) {
  routes.forEach(route => {
    route.operation.responses = responses;
  });
}

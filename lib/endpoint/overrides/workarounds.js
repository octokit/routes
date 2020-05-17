module.exports = workarounds;

const { getOperationId } = require("../../openapi");

function workarounds(state) {
  state.routes.forEach((route) => {
    const { operation, method, path } = route;

    // There are few cases when a whole page describes a single endpoint.
    // The titles on these pages don’t map well to method names, hence the overide
    // See https://github.com/octokit/routes/issues/50
    if (["Emojis", "Meta"].includes(operation.summary)) {
      operation.summary = "Get";
      operation.operationId = getOperationId(route);
    }

    // https://github.com/octokit/routes/issues/287
    if (operation.summary === "Create a comment (alternative)") {
      operation.summary = "Create a comment reply";
      operation.operationId = getOperationId(route);
    }
    if (
      operation.summary ===
      "create a Pull Request from an existing Issue by passing an Issue number "
    ) {
      operation.summary = "Create a Pull Request from an Issue";
      operation.operationId = getOperationId(route);
    }

    // remove once `id` no longer listed in parameter table for
    // 1. https://developer.github.com/v3/repos/deployments/#get-a-single-deployment-status
    // 2. https://developer.github.com/v3/repos/deployments/#list-deployment-statuses
    if (
      ["Get a single deployment status", "List deployment statuses"].includes(
        operation.summary
      )
    ) {
      operation.parameters = operation.parameters.filter(
        (param) => param.name !== "id"
      );
    }

    // The titles on these 3 pages are the same:
    // 1. https://developer.github.com/enterprise/2.15/v3/enterprise-admin/pre_receive_hooks/#get-a-single-pre-receive-hook
    // 2. https://developer.github.com/enterprise/2.15/v3/enterprise-admin/org_pre_receive_hooks/#get-a-single-pre-receive-hook
    // 3. https://developer.github.com/enterprise/2.15/v3/enterprise-admin/repo_pre_receive_hooks/#get-a-single-pre-receive-hook
    // Because they all end up on the same "enterpriseAdmin" scope, they end up conflicting.
    // To work around that, we append "-for-repo" / "-for-org" to the respective endpoints.
    // See https://github.com/octokit/routes/pull/336#issuecomment-452063583
    if (route.path.startsWith("/repos/:owner/:repo/pre-receive-hooks")) {
      operation.summary += " for repository";
      operation.operationId = getOperationId(route);
    }
    if (route.path.startsWith("/orgs/:org/pre-receive-hooks")) {
      operation.summary += " for organization";
      operation.operationId = getOperationId(route);
    }

    // "Render a Markdown document in raw mode" requires Content-Type header to be set
    // see https://developer.github.com/v3/markdown/#example-1
    if (route.path === "/markdown/raw") {
      operation.parameters.push({
        name: "content-type",
        description:
          "Setting content-type header is required for this endpoint",
        in: "header",
        schema: {
          type: "string",
          enum: ["text/plain; charset=utf-8"],
        },
      });
    }

    gistWorkarounds(route);

    if (
      /repos\/get-(apps|teams|users)-with-access-to-protected-branch/.test(
        route.operation.operationId
      )
    ) {
      route.operation.summary = route.operation.summary.replace(/^\w+/, "Get");
    }

    // These POST routes include pagination headers in response
    // https://developer.github.com/v3/projects/#create-a-user-project
    // https://developer.github.com/v3/projects/#create-an-organization-project
    // https://developer.github.com/v3/projects/#create-a-repository-project
    if (["POST", "PATCH", "PUT", "DELETE"].includes(method)) {
      route.operation.parameters = route.operation.parameters.filter(
        (parameter) => !["page", "per_page"].includes(parameter.name)
      );
    }

    const acceptHeader = route.operation.parameters.find(
      (parameter) => parameter.in === "header" && parameter.name === "accept"
    );

    // The "List all topics for a repository" requires an Accept header with a preview
    // content-type of "application/vnd.github.mercy-preview+json" to use.
    // However, the GitHub API specification doesn't specify it as required.
    // see https://github.com/octokit/routes/issues/356
    if (route.path.startsWith("/repos/:owner/:repo/topics")) {
      const preview = route.operation["x-github"].previews[0];
      preview.required = true;
      acceptHeader.schema.default = `application/vnd.github.${preview.name}-preview+json`;
      acceptHeader.description =
        "This API is under preview and subject to change.";
    }

    if (acceptHeader) {
      // luke-cage is not a required preview
      if (/luke-cage-preview/.test(acceptHeader.schema.default)) {
        acceptHeader.required = false;
        const preview = route.operation["x-github"].previews.find(
          (preview) => preview.name === "luke-cage"
        );
        preview.required = false;
      }

      // If a route has any required previews, set acceptHeader to required.
      if (
        route.operation["x-github"].previews.some((preview) => preview.required)
      ) {
        acceptHeader.required = true;
      }

      // scarlet-witch is not required for a get a repository
      // https://github.com/octokit/routes/pull/667#discussion_r387988023
      if (
        method === "GET" &&
        path === "/repos/:owner/:repo" &&
        /scarlet-witch/.test(acceptHeader.schema.default)
      ) {
        acceptHeader.required = false;
        acceptHeader.description =
          "Setting to `application/vnd.github.v3+json` is recommended";
        acceptHeader.schema.default = "application/vnd.github.v3+json";
        const preview = route.operation["x-github"].previews.find(
          (preview) => preview.name === "scarlet-witch"
        );
        preview.required = false;
      }
    }

    // The legacy search API endpoints should be flagged as deprecated, but are not right now,
    // because the deprecation notice is not included in each endpoint.
    if (/^\/legacy\//.test(path)) {
      route.operation.deprecated = true;
    }
  });
}

function gistWorkarounds(route) {
  const { operation } = route;
  const restPattern = route.method + " " + route.path;

  // Allows you to update or delete a gist file and rename gist files.
  // Files from the previous version of the gist that aren't explicitly
  // changed during an edit are unchanged.
  // see https://developer.github.com/v3/gists/#update-a-gist
  if (restPattern === "PATCH /gists/:gist_id") {
    operation.requestBody.content[
      "application/json"
    ].schema.properties.files = {
      type: "object",
      description: "The filenames and content that make up this gist.",
      additionalProperties: {
        type: "object",
        properties: {
          content: {
            type: "string",
            description: "The updated content of the file.",
          },
          filename: {
            type: "string",
            description:
              "The new name for this file. To delete a file, set the value of the filename to `null`.",
          },
        },
      },
    };
  }

  // see https://developer.github.com/v3/gists/#get-a-gist
  if (restPattern === "GET /gists/:gist_id") {
    operation.responses[200].content[
      "application/json"
    ].schema.properties.files = {
      type: "object",
      additionalProperties: {
        type: "object",
        properties: {
          filename: { type: "string" },
          type: { type: "string" },
          language: { type: "string" },
          raw_url: { type: "string" },
          size: { type: "number" },
          truncated: { type: "boolean" },
          content: { type: "string" },
        },
      },
    };
  }

  // Allows you to add a new gist with one or more files.
  // see https://developer.github.com/v3/gists/#create-a-gist
  if (restPattern === "POST /gists") {
    operation.requestBody.content[
      "application/json"
    ].schema.properties.files = {
      type: "object",
      description:
        "The filenames and content of each file in the gist. The keys in the `files` object represent the filename and have the type `string`.",
      additionalProperties: {
        type: "object",
        properties: {
          content: {
            type: "string",
            description: "The content of the file.",
          },
        },
      },
    };

    operation.responses[201].content[
      "application/json"
    ].schema.properties.files = {
      type: "object",
      additionalProperties: {
        type: "object",
        properties: {
          filename: { type: "string" },
          type: { type: "string" },
          language: { type: "string" },
          raw_url: { type: "string" },
          size: { type: "number" },
          truncated: { type: "boolean" },
          content: { type: "string" },
        },
      },
    };
  }

  // see https://developer.github.com/v3/gists/#get-a-specific-revision-of-a-gist
  if (restPattern === "GET /gists/:gist_id/:sha") {
    operation.responses[200].content[
      "application/json"
    ].schema.properties.files = {
      type: "object",
      additionalProperties: {
        type: "object",
        properties: {
          filename: { type: "string" },
          type: { type: "string" },
          language: { type: "string" },
          raw_url: { type: "string" },
          size: { type: "number" },
          truncated: { type: "boolean" },
          content: { type: "string" },
        },
      },
    };
  }

  // see https://developer.github.com/v3/gists/#list-gists-for-the-authenticated-user
  if (restPattern === "GET /gists") {
    operation.responses[200].content[
      "application/json"
    ].schema.items.properties.files = {
      type: "object",
      additionalProperties: {
        type: "object",
        properties: {
          filename: { type: "string" },
          type: { type: "string" },
          language: { type: "string" },
          raw_url: { type: "string" },
          size: { type: "number" },
        },
      },
    };
  }

  // see https://developer.github.com/v3/gists/#list-public-gists
  if (restPattern === "GET /gists/public") {
    operation.responses[200].content[
      "application/json"
    ].schema.items.properties.files = {
      type: "object",
      additionalProperties: {
        type: "object",
        properties: {
          filename: { type: "string" },
          type: { type: "string" },
          language: { type: "string" },
          raw_url: { type: "string" },
          size: { type: "number" },
        },
      },
    };
  }

  // see https://developer.github.com/v3/gists/#list-starred-gists
  if (restPattern === "GET /gists/starred") {
    operation.responses[200].content[
      "application/json"
    ].schema.items.properties.files = {
      type: "object",
      additionalProperties: {
        type: "object",
        properties: {
          filename: { type: "string" },
          type: { type: "string" },
          language: { type: "string" },
          raw_url: { type: "string" },
          size: { type: "number" },
        },
      },
    };
  }

  // see https://developer.github.com/v3/gists/#list-gists-for-a-user
  if (restPattern === "GET /users/:username/gists") {
    operation.responses[200].content[
      "application/json"
    ].schema.items.properties.files = {
      type: "object",
      additionalProperties: {
        type: "object",
        properties: {
          filename: { type: "string" },
          type: { type: "string" },
          language: { type: "string" },
          raw_url: { type: "string" },
          size: { type: "number" },
        },
      },
    };
  }
}

const _ = require("lodash");
const cheerio = require("cheerio");
const turndown = require("../../turndown");

const commonTitles = ["Request", "Response", "Example"];

const descriptionTitles = [
  "The verification object",
  "Signature verification object",
  "The reason field",
  "Import status",
  "The project_choices field",
  "Git LFS related fields",
  "Understanding Your Rate Limit Status",
  "Object attributes",
  "OAuth scope requirements",
  "Rate limits",
  "Working with large comparisons",
  "Filter parameter",
  "Highlighting repository search results",
  "Considerations for commit search",
  "Highlighting code search results",
  "Considerations for code search",
  "Highlighting issue search results",
  "Highlighting user search results",
  "Highlighting topic search results",
  "Highlighting label search results",
  "Understanding your rate limit status"
];

const alternativeResponseTitles = [
  "Reactions summary",
  "Client Errors",
  "Issue comments created by users via integrations",
  "Issues opened by users via integrations",
  "Issue events triggered by users via integrations",
  "Parameters for updating project choice",
  "Parameters for restarting import",
  "Deployments created by users via integrations",
  "Failed commit status checks",
  "Deployment statuses created by users via integrations"
];

module.exports = {
  is(el) {
    return cheerio(el).is("h3, h4");
  },
  parse(el) {
    const $el = cheerio(el);
    const text = $el
      .text()
      .replace(/\s+/g, " ")
      .trim();

    if (commonTitles.includes(text)) {
      return {
        type: `${_.camelCase(text)}Title`,
        text
      };
    }

    if (descriptionTitles.includes(text)) {
      return {
        type: "description",
        text: `**${text}**`
      };
    }

    if (text.toLowerCase() === "alternative input") {
      return {
        type: "alternativeParametersTitle",
        text
      };
    }

    if (text.toLowerCase() === "optional parameters") {
      return {
        type: "optionalParametersTitle",
        text
      };
    }

    if (/^((body )?parameters|input)/i.test(text)) {
      // TODO: Handle alternative responses
      return {
        type: "parametersTitle",
        text
      };
    }

    if (
      alternativeResponseTitles.includes(text) ||
      /\bresponse\b/i.test(text)
    ) {
      // TODO: Handle alternative responses
      return {
        type: "alternativeResponseTitle",
        text
      };
    }

    if (/^(Simple|Advanced)? ?Example/i.test(text)) {
      // TODO: Handle alternative responses
      return {
        type: "exampleTitle",
        text
      };
    }

    if (/^(Stubbed endpoint)$/.test(text)) {
      // TODO: Handle alternative responses
      return {
        type: "alternativeRouteTitle",
        text
      };
    }

    if (/^Deprecation notice/i.test(text)) {
      // TODO: Handle response descriptions
      return {
        type: "DeprecationTitle",
        text
      };
    }

    if (/^[a-z0-9_]+ object$/i.test(text)) {
      // e.g. "output object" as seen in https://developer.github.com/v3/checks/runs/#create-a-check-run
      return {
        type: "description",
        text: turndown(cheerio.html(el))
      };
    }

    if (text === "Body") {
      // TODO: handle response body tables
      return {
        type: "ResponseBodyTitle",
        text
      };
    }
  }
};

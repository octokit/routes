const _ = require("lodash");
const cheerio = require("cheerio");
const markdownTable = require("markdown-table");

const turndown = require("../../turndown");

const REQUIRED_REGEXP = /^\*\*Required(\*\*\.|\.\*\*) /;
const HAS_UNCONDITIONAL_DEFAULT_REGEXP = /\bDefault: `(?!Time\.now`)\S+`\.?\s*(?:\n.*|\*\*Note:?\*\*.*)?$/;
const CAN_BE_ONE_OF_REGEXP = /(can be|one of|possible values are|include:|valid values are|options are|either|by number of|determines whether the first search result returned is the highest number of matches|sorts the results of your query by)/i;
const NOT_COMMA_SEPARATED_REGEXP = /comma-separated list of values/i;
const ALLOW_NULL_REGEXP = /\b(set to|or) `null`/i;

module.exports = {
  is(el) {
    return cheerio(el).is("table");
  },
  parse(el) {
    const $el = cheerio(el);

    if (isParametersTable($el)) {
      return {
        type: "parameters",
        params: toParams($el)
      };
    }

    if (isBodyResponseTable($el)) {
      return {
        type: "responseBody",
        params: toParams($el)
      };
    }

    return {
      type: "description",
      text: toData($el)
    };
  }
};

/**
 * Identify parameters table by table head that looks like this
 * <thead>
 *   <tr>
 *     <th>Name</th>
 *     <th>Type</th>
 *     <th>Description</th>
 *   </tr>
 * </thead>
 * As Body response tables look the same, we also check if a preceeding <h3>
 * tag includes the word "Response".
 */
function isParametersTable($table) {
  const hasParametersHeaders =
    $table
      .find("thead")
      .text()
      .replace(/\s/g, "") === "NameTypeDescription";
  const isResponseBodyTable = /Response/.test($table.prevAll("h3").text());
  return hasParametersHeaders && !isResponseBodyTable;
}

function isBodyResponseTable($table) {
  const hasParametersHeaders =
    $table
      .find("thead")
      .text()
      .replace(/\s/g, "") === "NameTypeDescription";
  const isResponseBodyTable = /Response/.test($table.prevAll("h3").text());
  return hasParametersHeaders && isResponseBodyTable;
}

function toParams($table) {
  const params = $table
    .find("tbody tr")
    .map(rowToParameter)
    .get();

  // if all param names are in the form of "parent.child", then add a "parent"
  // parameter with type "object"
  // https://github.com/octokit/routes/issues/405
  if (params.filter(param => /\./.test(param.name)).length === params.length) {
    params.unshift({
      name: params[0].name.split(/\./)[0],
      type: "object",
      description: "",
      required: !!params.find(param => param.required),
      location: "body"
    });
  }

  return params;
}

function rowToParameter(i, el) {
  const [
    name,
    type,
    { description, defaultValue, enumValues, regex, isRequired, allowNull }
  ] = cheerio(el)
    .children()
    .map((i, el) => {
      if (i < 2) {
        // first two columns are simply name and type
        return cheerio(el)
          .text()
          .trim();
      }

      const text = turndown(
        cheerio(el)
          .html()
          .trim()
      );
      const hasUnconditionalDefault = HAS_UNCONDITIONAL_DEFAULT_REGEXP.test(
        text
      );
      let description = turndown(cheerio(el).html());
      let defaultValue;

      if (hasUnconditionalDefault) {
        let [, _defaultValue, afterDefaultDescription = ""] =
          text.match(/\bDefault: `([^`]+)`\.?\s*(.*)/) || [];

        defaultValue =
          _defaultValue || (text.match(/\bDefault: (.*)$/) || []).pop();

        // if description after the default value continues with a lowercase letter
        // it is likely directly related to it, e.g.
        //  > Default: true when environment is production and false otherwise.
        // https://developer.github.com/v3/repos/deployments/#create-a-deployment
        if (/^[a-z]/.test(afterDefaultDescription)) {
          const [
            defaultDescription,
            ...rest
          ] = afterDefaultDescription.trim().split(/\.[\s\n]/);
          afterDefaultDescription = rest.join(". ");
          defaultValue = `\`${defaultValue}\` ${defaultDescription}`;
        }
        description = [
          description.replace(/\bDefault: .*$/, "").trim(),
          afterDefaultDescription
        ]
          .filter(Boolean)
          .join(" ");

        try {
          // turn '["push"]' string into ["push"] array.
          defaultValue = JSON.parse(defaultValue);
        } catch (error) {}
      }

      const isRequired = REQUIRED_REGEXP.test(description);

      if (isRequired) {
        description = description.replace(REQUIRED_REGEXP, "");
      }

      let enumValues = [];
      if (
        CAN_BE_ONE_OF_REGEXP.test(description) &&
        !NOT_COMMA_SEPARATED_REGEXP.test(description)
      ) {
        const results = description
          .replace(
            /(, where|when you leave this blank|by leaving this blank|Ignored|\*\*Required\*\* when|Default:|\*\*Note:\*\*|\n\s*\n)[^]*$/i,
            ""
          )
          // this is a tricky one, "assigne" parameter at
          // https://developer.github.com/v3/issues/#list-issues-for-a-repository
          .replace(/Pass in[^]+$/)
          // Another tricky one
          // https://developer.github.com/v3/checks/runs/#create-a-check-run
          .replace(/When the conclusion is[^]+$/)
          .split(CAN_BE_ONE_OF_REGEXP)
          .pop()
          .match(/`([^`]+)`/g);

        enumValues = _.uniq((results || []).map(s => s.replace(/`/g, "")));
      }

      // Sometimes enum values contain placeholders in which case we turn it into a
      // regex pattern, see https://github.com/octokit/routes/issues/121
      let regex;
      if (enumValues.find(value => /<.*>/.test(value))) {
        regex = `^(${enumValues
          .map(v => v.replace(/<.*>/, "\\d+"))
          .join("|")})$`;
        enumValues = [];
      }

      const allowNull = ALLOW_NULL_REGEXP.test(description);

      description = replaceTimeNowDefault(description);

      return {
        description,
        defaultValue,
        enumValues,
        regex,
        isRequired,
        allowNull
      };
    })
    .get();

  const param = {
    name,
    type: type.toLowerCase(),
    description,
    default: defaultValue,
    required: isRequired
  };

  if (/array of.*objects/.test(param.type)) {
    param.type = "object[]";
  }

  if (/array of.*integers/.test(param.type)) {
    param.type = "integer[]";
  }

  if (param.type === "array") {
    param.type = /_ids$/.test(param.name) ? "integer[]" : "string[]";
  }

  if (param.type === "url") {
    param.type = "string";
  }

  if (param.type === "text") {
    param.type = "string";
  }

  if (/integer or string/.test(param.type)) {
    param.type = "string";
  }

  if (param.name === "content") {
    if (/reaction type/.test(param.description) === true) {
      param.enum = [
        "+1",
        "-1",
        "laugh",
        "confused",
        "heart",
        "hooray",
        "rocket",
        "eyes"
      ];
    }
  }

  if (param.name === "type") {
    if (
      /Normally this is a `commit` but it can also be a `tree` or a `blob/.test(
        param.description
      ) === true
    ) {
      param.enum = ["commit", "tree", "blob"];
    }
  }

  if (param.name === "state") {
    if (/Only `"active"` will be accepted/.test(param.description) === true) {
      param.enum = ["active"];
    }
  }

  if (param.name === "privacy" && param.default === "secret") {
    param.enum = ["secret", "closed"];
  }

  if (param.name === "default_repository_permission") {
    if (
      /Default permission level members have for organization repositories:/.test(
        param.description
      ) === true
    ) {
      param.enum = ["read", "write", "admin", "none"];
    }
  }

  if (param.name === "sort") {
    if (/Can only be/.test(param.description) === true) {
      param.enum = ["indexed"];
    }
  }

  if (/array of.*strings/.test(param.type)) {
    param.type = "string[]";
  }

  if (enumValues.length > 1 && param.type === "string") {
    param.enum = enumValues;
  }

  if (regex) {
    param.type = "string";
    param.regex = regex;
  }

  // 'true' / 'false' => true / false
  if (param.type === "boolean" && ["true", "false"].includes(defaultValue)) {
    param.default = defaultValue === "true";
  }

  if (allowNull) {
    param.allowNull = true;
  }

  // If param name is sth like "source[branch]", then change the param to source.path
  // https://github.com/octokit/routes/issues/405
  if (/\[\w+\]/.test(param.name)) {
    const [, parentParamName, childParamName] = param.name.match(
      /^(\w+)\[(\w+)/
    );
    param.name = [parentParamName, childParamName].join(".");
  }

  return _.omitBy(param, _.isUndefined);
}

function toData($table) {
  const data = [];
  $table
    .find("tr")
    .each((i, el) => {
      const values = cheerio(el)
        .find("td, th")
        .map((i, el) => turndown(cheerio(el).html()))
        .get();
      data.push(values);
    })
    .get();

  return markdownTable(data);
}

function replaceTimeNowDefault(description) {
  return description.replace(
    "Default: `Time.now`",
    "Default: current date/time"
  );
}

module.exports = addCodeSamples;

const { URL } = require("url");

const urlTemplate = require("url-template");
const { stringify } = require("javascript-stringify");
const { mapValues, camelCase, snakeCase } = require("lodash");

const { getScope, getIdName } = require("../openapi");

// TODO: find a better place to define parameter examples
const PARAMETER_EXAMPLES = {
  owner: "octocat",
  repo: "hello-world",
  email: "octocat@github.com",
  emails: ["octocat@github.com"]
};

function addCodeSamples({ routes, serverUrl }) {
  routes.forEach(route => {
    const scope = getScope(route.operation.externalDocs.url);
    const idName = getIdName(route, scope);
    const codeSampleParams = { route, scope, idName, serverUrl };
    route.operation["x-code-samples"] = route.operation[
      "x-code-samples"
    ].concat(
      { lang: "Shell", source: toShellExample(codeSampleParams) },
      { lang: "JS", source: toJsExample(codeSampleParams) }
    );
  });
}

function toShellExample({ route, scope, idName, serverUrl }) {
  const pathParams = mapValues(
    getExamplePathParams(route),
    (value, paramName) =>
      PARAMETER_EXAMPLES[paramName] ? value : snakeCase(value).toUpperCase()
  );
  const path = urlTemplate
    .parse(route.path.replace(/:(\w+)/g, "{$1}"))
    .expand(pathParams);
  const params = getExampleBodyParams(route);

  const { method } = route;
  const defaultAcceptHeader = route.operation.parameters[0].schema.default;

  const args = [
    method !== "GET" && `-X${method}`,
    `-H"Accept: ${defaultAcceptHeader}"`,
    new URL(path, serverUrl).href,
    Object.keys(params).length && `-d '${JSON.stringify(params)}'`
  ].filter(Boolean);
  return `curl \\\n  ${args.join(" \\\n  ")}`;
}

function toJsExample({ route, scope, idName, serverUrl }) {
  const params = route.operation.parameters
    .filter(param => !param.deprecated)
    .filter(param => param.in !== "header")
    .filter(param => param.required)
    .reduce(
      (params, param) =>
        Object.assign(params, {
          [param.name]: getExampleParamValue(param.name, param.schema)
        }),
      {}
    );
  Object.assign(params, getExampleBodyParams(route));

  const method = `${camelCase(scope)}.${camelCase(idName)}`;
  return `octokit.${method}(${
    Object.keys(params).length ? stringify(params, null, 2) : ""
  })`;
}

function getExamplePathParams({ operation }) {
  const pathParams = operation.parameters.filter(param => param.in === "path");
  if (pathParams.length === 0) {
    return {};
  }
  return pathParams.reduce((dict, param) => {
    dict[param.name] = getExampleParamValue(param.name, param.schema);
    return dict;
  }, {});
}

function getExampleBodyParams({ operation }) {
  let schema;
  try {
    schema = operation.requestBody.content["application/json"].schema;
  } catch (noRequestBody) {
    return {};
  }
  if (operation["x-github"].requestBodyParameterName) {
    const paramName = operation["x-github"].requestBodyParameterName;
    return { [paramName]: getExampleParamValue(paramName, schema) };
  }
  const props =
    schema.required && schema.required.length > 0
      ? schema.required
      : Object.keys(schema.properties).slice(0, 1);
  return props.reduce((dict, propName) => {
    const propSchema = schema.properties[propName];
    if (!propSchema.deprecated) {
      dict[propName] = getExampleParamValue(propName, propSchema);
    }
    return dict;
  }, {});
}

function getExampleParamValue(name, schema) {
  const value = PARAMETER_EXAMPLES[name];
  if (value) {
    return value;
  }
  switch (schema.type) {
    case "string":
      return name;
    case "boolean":
      return true;
    case "integer":
      return 42;
    case "object":
      return mapValues(schema.properties, (propSchema, propName) =>
        getExampleParamValue(propName, propSchema)
      );
    case "array":
      return [getExampleParamValue(name, schema.items)];
  }
  throw new Error(`Unknown data type: ${schema.type}`);
}

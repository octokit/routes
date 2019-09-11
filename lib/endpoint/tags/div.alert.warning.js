const cheerio = require("cheerio");

const turndown = require("../../turndown");

const REGEX_IS_PREVIEW_WARNING = /The API may change without advance notice during the preview period/;

module.exports = {
  is(el) {
    return cheerio(el).is(".alert.warning");
  },
  parse(el) {
    const $el = cheerio(el);
    const text = $el.text();

    if (REGEX_IS_PREVIEW_WARNING.test(text)) {
      return {
        type: "previewWarning"
      };
    }

    return {
      type: "description",
      text: turndown($el.html()),
      isWarning: true
    };
  }
};

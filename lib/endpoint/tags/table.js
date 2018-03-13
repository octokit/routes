const _ = require('lodash')
const cheerio = require('cheerio')
const markdownTable = require('markdown-table')

const turndown = require('../../turndown')

const REQUIRED_REGEXP = /^\*\*Required\*\*\. /
const CAN_BE_ONE_OF_REGEXP = /^Can be one of (`[a-z]+`)(, `[a-z]+`)*/
const EITHER_REGEXP = /^Either (`[a-z]+`)/

module.exports = {
  is (el) {
    return cheerio(el).is('table')
  },
  parse (el) {
    const $el = cheerio(el)

    if (isParametersTable($el)) {
      return {
        type: 'parameters',
        params: toParams($el)
      }
    }

    return {
      type: 'description',
      text: toData($el)
    }
  }
}

/**
 * Identify parameters table by table head that looks like this
 * <thead>
 *   <tr>
 *     <th>Name</th>
 *     <th>Type</th>
 *     <th>Description</th>
 *   </tr>
 * </thead>
 */
function isParametersTable ($table) {
  return $table.find('thead').text().replace(/\s/g, '') === 'NameTypeDescription'
}

function toParams ($table) {
  return $table
    .find('tbody tr')
    .map(rowToParameter)
    .get()
}

function rowToParameter (i, el) {
  const [name, type, {description, defaultValue, enumValues, isRequired}] = cheerio(el)
    .children()
    .map((i, el) => {
      if (i < 2) { // first two colums are simply name and type
        return cheerio(el).text().trim()
      }

      const text = cheerio(el).text().trim()
      const defaultValue = (text.match(/ Default: (.*)$/) || []).pop()

      let description = turndown(cheerio(el).html().trim().replace(/ Default: .*$/, ''))
      const isRequired = REQUIRED_REGEXP.test(description)

      if (isRequired) {
        description = description.replace(REQUIRED_REGEXP, '')
      }

      let enumValues
      if (CAN_BE_ONE_OF_REGEXP.test(description)) {
        // enumValues = description.replace('Can be one of ', '').replace(/ or /g, '').split(/[, \.]/).filter((term) => term[0] === '`').map((term) => term.substring(1, term.length - 1))
        enumValues = description.replace(/[,.]/g, '').split(' ').filter((term) => term[0] === '`' && term[term.length - 1] === '`').map((term) => term.substring(1, term.length - 1))
      } else if (EITHER_REGEXP.test(description)) {
        // Include only words that begin and end with backticks (ignore all others)
        enumValues = description.replace(/[,.]/g, '').split(' ').filter((term) => term[0] === '`' && term[term.length - 1] === '`').map((term) => term.substring(1, term.length - 1))
      }

      return {
        description,
        defaultValue,
        enumValues,
        isRequired
      }
    })
    .get()

  return _.omitBy({
    name,
    type: enumValues ? 'enum' : type,
    options: enumValues,
    description: description,
    default: defaultValue,
    required: isRequired
  }, _.isUndefined)
}

function toData ($table) {
  const data = []
  $table
    .find('tr')
    .each((i, el) => {
      const values = cheerio(el)
        .find('td, th')
        .map((i, el) => turndown(cheerio(el).html()))
        .get()
      data.push(values)
    })
    .get()

  return markdownTable(data)
}

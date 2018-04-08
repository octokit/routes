const _ = require('lodash')
const cheerio = require('cheerio')
const markdownTable = require('markdown-table')

const turndown = require('../../turndown')

const REQUIRED_REGEXP = /^\*\*Required\*\*\. /
const CAN_BE_ONE_OF_REGEXP = /(can be|one of|possible values are|include:|valid values are|either)/i
const ALLOW_NULL_REGEXP = /\b(set to|or) `null`/i

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
  const [name, type, {description, defaultValue, enumValues, isRequired, allowNull}] = cheerio(el)
    .children()
    .map((i, el) => {
      if (i < 2) { // first two columns are simply name and type
        return cheerio(el).text().trim()
      }

      const text = turndown(cheerio(el).html().trim())
      const hasDefault = /\bDefault: /.test(text)
      let description = turndown(cheerio(el).html())
      let defaultValue

      if (hasDefault) {
        let [, _defaultValue, afterDefaultDescription = ''] = text.match(/\bDefault: `([^`]+)`\.?\s*(.*)/) || []

        defaultValue = _defaultValue || (text.match(/\bDefault: (.*)$/) || []).pop()

        // if description after the default value continues with a lowercase letter
        // it is likely directly related to it, e.g.
        //  > Default: true when environment is production and false otherwise.
        // https://developer.github.com/v3/repos/deployments/#create-a-deployment
        if (/^[a-z]/.test(afterDefaultDescription)) {
          const [defaultDescription, ...rest] = afterDefaultDescription.split(/\.[\s\n]/)
          afterDefaultDescription = rest.join('. ')
          defaultValue = `\`${defaultValue}\` ${defaultDescription.replace(/\.$/, '')}`
        }
        description = [
          description.replace(/\bDefault: .*$/, '').trim(),
          afterDefaultDescription
        ].filter(Boolean).join(' ')
      }
      const isRequired = REQUIRED_REGEXP.test(description)

      if (isRequired) {
        description = description.replace(REQUIRED_REGEXP, '')
      }

      let enumValues = []
      if (CAN_BE_ONE_OF_REGEXP.test(description)) {
        const results = description
          .replace(/(, where|when you leave this blank|by leaving this blank|Ignored|\*\*Required\*\* when|Default:|\n\s*\n)[^]*$/i, '')
          // this is a tricky one, "assigne" parameter at
          // https://developer.github.com/v3/issues/#list-issues-for-a-repository
          .replace(/Pass in[^]+$/)
          .split(CAN_BE_ONE_OF_REGEXP)
          .pop()
          .match(/`([^`]+)`/g)

        enumValues = _.uniq((results || []).map(s => s.replace(/`/g, '')))
      }

      const allowNull = ALLOW_NULL_REGEXP.test(description)

      return {
        description,
        defaultValue,
        enumValues,
        isRequired,
        allowNull
      }
    })
    .get()

  const params = {
    name,
    type: type.toLowerCase(),
    description,
    default: defaultValue,
    required: isRequired
  }

  if (/array of.*objects/.test(params.type)) {
    params.type = 'objects[]'
  }

  if (params.name === 'content') {
    if (/reaction type/.test(params.description) === true) {
      params.enum = ['+1',
        '-1',
        'laugh',
        'confused',
        'heart',
        'hooray']
    }
  }

  if (params.name === 'type') {
    if (/Normally this is a `commit`/.test(params.description) === true) {
      params.enum = ['commit',
        'tree',
        'blob']
    }
  }

  if (params.name === 'state') {
    if (/active/.test(params.description) === true) {
      params.enum = ['active']
    }
  }

  if (params.name === 'default_repository_permission') {
    if (/organization repositories:/.test(params.description) === true) {
      params.enum = ['read',
        'write',
        'admin',
        'none']
    }
  }

  if (/array of.*strings/.test(params.type)) {
    params.type = 'string[]'
  }

  if (enumValues.length > 1 && params.type !== 'boolean') {
    params.type = 'string'
    params.enum = enumValues
  }

  // 'true' / 'false' => true / false
  if (params.type === 'boolean' && ['true', 'false'].includes(defaultValue)) {
    params.default = defaultValue === 'true'
  }

  if (allowNull) {
    params.allowNull = true
  }

  return _.omitBy(params, _.isUndefined)
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

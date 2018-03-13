module.exports = htmlToJson

const cheerio = require('cheerio')
const elementToBlock = require('./element-to-block')
const htmlContainsEndpoint = require('./html-contains-endpoint')

function htmlToJson (html) {
  if (!htmlContainsEndpoint(html)) {
    return
  }

  const $ = cheerio.load(html)

  const blocks = $('body > *')
    .map((i, el) => {
      const block = elementToBlock(el)

      if (!block) {
        throw new Error('Could not identify block type for:\n' + cheerio.html(el))
      }

      return block
    })
    .get()

  const routeBlocks = blocks.filter(block => block.type === 'route')

  const {text: name, enabledForApps} = blocks.find(block => block.type === 'title')
  const description = blocks
    .filter(block => block.type === 'description')
    .map(block => block.text)
    .join('\n\n')

  // TODO: Find descriptions and set params for multi-route sections
  if (routeBlocks.length > 1) {
    return routeBlocks.map(({method, path}) => ({
      name,
      method,
      path
    }))
  }

  const {params} = blocks.find(block => block.type === 'parameters') || {params: []}

  const [{method, path}] = routeBlocks

  return {
    name,
    method,
    path,
    description,
    params,
    enabledForApps
  }
}

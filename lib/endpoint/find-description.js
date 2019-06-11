module.exports = findDescription

const normalizeMarkdown = require('../normalize-markdown')

function findDescription (state) {
  const description = state.blocks
    .filter(block => block.type === 'description')
    .map(block => block.text)
    .join('\n\n')

  const newDescription = normalizeMarkdown(state, description)
  state.results.forEach(result => {
    result.description = newDescription
  })
}

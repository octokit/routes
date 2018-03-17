module.exports = findDescription

function findDescription (state) {
  const description = state.blocks
    .filter(block => block.type === 'description')
    .map(block => block.text)
    .join('\n\n')

  state.results.forEach(result => {
    result.description = description
  })
}

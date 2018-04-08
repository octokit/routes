module.exports = findDescription

function findDescription (state) {
  const description = state.blocks
    .filter(block => block.type === 'description')
    .map(block => block.text)
    .join('\n\n')

  const newDescription = description.replace(/]\(\/(v3|apps|webhooks)/g, '](https://developer.github.com/$1')
  state.results.forEach(result => {
    result.description = newDescription
  })
}

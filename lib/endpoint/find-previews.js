module.exports = findPreviews

const normalizeMarkdown = require('../normalize-markdown')

function findPreviews (state) {
  const previewBlocks = state.blocks.filter(block => block.type === 'preview')

  state.results.forEach(result => {
    if (previewBlocks.length === 0) {
      result.previews = []
      return
    }

    result.previews = previewBlocks.map(block => {
      return {
        name: block.preview,
        description: normalizeMarkdown(state, block.text),
        required: block.required
      }
    })
  })
}

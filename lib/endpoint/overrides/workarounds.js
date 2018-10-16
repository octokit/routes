module.exports = workarounds

function workarounds (state) {
  state.results.forEach(result => {
    // There are few cases when a whole page describes a single endpoint.
    // The titles on these pages don’t map well to method names, hence the overide
    // See https://github.com/octokit/routes/issues/50
    if (['Emojis', 'Meta'].includes(result.name)) {
      result.name = 'Get'
      result.idName = 'get'
    }

    // https://github.com/octokit/routes/issues/287
    if (result.name === 'Create a comment (alternative)') {
      result.name = 'Create a comment reply'
      result.idName = 'create-comment-reply'
    }
    if (result.name === 'create a Pull Request from an existing Issue by passing an Issue number ') {
      result.name = 'Create a Pull Request from an Issue'
      result.idName = 'create-from-issue'
    }
  })
}

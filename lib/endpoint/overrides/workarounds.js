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
  })
}

module.exports = addTriggersNotificationFlag;

/**
 * From "Best practices for integrators"
 * > Requests that create content which triggers notifications, such as issues,
 *   comments and pull requests, may be further limited and will not include
 *   a Retry-After header in the response. Please create this content at a
 *   reasonable pace to avoid further limiting.
 * - Source: https://developer.github.com/v3/guides/best-practices-for-integrators/#dealing-with-abuse-rate-limits
 */
function addTriggersNotificationFlag(state) {
  state.routes.forEach(route => {
    if (
      /This endpoint triggers \[notifications\]/.test(
        route.operation.description
      )
    ) {
      route.operation["x-github"].triggersNotification = true;
    }
  });
}

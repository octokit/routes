# Suggestions

- https://developer.github.com/v3/gitignore/#listing-available-templates  
  → List available templates
- https://developer.github.com/v3/activity/notifications/#view-a-single-thread  
  → Get a single thread
- https://developer.github.com/v3/orgs/members/#members-list  
  → List members
- https://developer.github.com/v3/migration/migrations/#get-a-list-of-migrations  
  → List migrations
- https://developer.github.com/v3/migration/migrations/#get-the-status-of-a-migration  
  → Get a migration
- https://developer.github.com/v3/orgs/members/#public-members-list  
  → List public members
- https://developer.github.com/v3/projects/collaborators/#add-user-as-a-collaborator  
  → Add collaborator
- https://developer.github.com/v3/repos/collaborators/#add-user-as-a-collaborator  
  → Add collaborator
- https://developer.github.com/v3/repos/community/#retrieve-community-profile-metrics  
  → Get community profile metrics
- https://developer.github.com/v3/repos/collaborators/#review-a-users-permission-level  
  → Get a collaborator’s permission level
- https://developer.github.com/v3/repos/merging/#perform-a-merge  
  → Merge
- https://developer.github.com/v3/issues/labels/#get-labels-for-every-issue-in-a-milestone  
  → List labels for every issue in a milestone
- https://developer.github.com/v3/pulls/#get-if-a-pull-request-has-been-merged  
  → Check if a pull request has been merged
- https://developer.github.com/v3/repos/traffic/#list-paths  
  → Get top paths
- https://developer.github.com/v3/repos/traffic/#list-referrers  
  → Get top referrers
- https://developer.github.com/v3/scim/#get-a-list-of-provisioned-identities  
  → Get provisioned identities
- https://developer.github.com/v3/teams/#list-team-repos  
  → List team repositories
- https://developer.github.com/v3/teams/discussion_comments/#list-comments  
  → List discussion comments
- https://developer.github.com/v3/users/blocking/#check-whether-youve-blocked-a-user  
  → Check if you have blocked a user
- https://developer.github.com/v3/apps/marketplace/#get-a-users-marketplace-purchases  
  → List your Marketplace purchases
- https://developer.github.com/v3/apps/marketplace/#get-a-users-marketplace-purchases  
  → List your Marketplace purchases (stubbed)
- https://developer.github.com/v3/repos/invitations/#list-a-users-repository-invitations  
  → List your repository invitations
- https://developer.github.com/v3/activity/starring/#list-repositories-being-starred  
  → List your starred repositories
- https://developer.github.com/v3/activity/watching/#list-repositories-being-watched  
  → List repositories that you are watching
- https://developer.github.com/v3/users/#get-all-users  
  → List users
- https://developer.github.com/v3/users/#get-a-single-user  
  → Get a single user by username
- https://developer.github.com/v3/orgs/#list-user-organizations  
  → list organizations for a user
- https://developer.github.com/v3/repos/#list-user-repositories  
  → list repositories for a user
- https://developer.github.com/v3/git/refs/#get-all-references
  → List references

# Questions

- https://developer.github.com/v3/apps/marketplace/#check-if-a-github-account-is-associated-with-any-marketplace-listing  
    → What is it doing exactly?
- https://developer.github.com/v3/activity/events/#list-public-events-for-a-network-of-repositories  
    → why "network of repositories"? Isn’t it just events for the given repository?

- https://developer.github.com/v3/pulls/reviews/#delete-a-pending-review  
    → I checked and can confirm that only pending reviews can be deleted. When trying to delete a non-pending review I get a "Can not delete a non-pending pull request review" error. But I wonder how I can get the ID for a pending review? Listing all reviews for a PR does not return my pending review

# Creating a release

1. Create a new release branch from `dev`: 

    `git checkout -b release/vX.X.X`

1. Bump the version with lerna *without publishing git tags*: 

    `npx lerna version --no-git-tag-version`.
    
    You will be prompted for new version.

1. Update the [change log](./changelog.md), commit, and push the branch
1. Make a PR to *master*. If you use [hub](https://hub.github.com/):

    `hub pull-request -b master -m "Version X.X.X"`
1. Request a review and wait
1. Once approved, do a **regular merge, not squash merge**. *Do not delete the branch.*
1. Check that CircleCI properly adds the tags and publishes the new version to npm.
1. Create a new PR from the release branch but this time to `dev`:

    `hub pull-request -b dev -m "Version X.X.X to dev."`
1. Merge with a **regular merge, not squash merge**

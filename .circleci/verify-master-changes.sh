#!/bin/bash

get_version_from_file() {
  echo `cat "$1" | grep version | awk 'BEGIN { FS="\"" } { print $4 }'`
}

# verify the files were changed
if [[ $# -lt 1 ]]; then
  BRANCH_CMP="master~1"
else
  BRANCH_CMP=$1
fi
PACKAGES_CHANGED=`git diff --name-only origin/master $BRANCH_CMP -- | grep package.json | grep packages`
CHANGELOG_UPDATED=`git diff --name-only origin/master $BRANCH_CMP -- | grep changelog.md | wc -l`
N_PACKAGES_CHANGED=`echo $PACKAGES_CHANGED | wc -w`
N_PACKAGES=`ls packages | wc -w`

echo "Verifying minimal requirements for master merge"
echo "Verifying all package.json in monorepos were modified..."
if [ $N_PACKAGES_CHANGED -ne $N_PACKAGES ]; then
  echo "package.json was not updated across our monorepo!"
  exit 1
else
  echo "Success!"
fi
echo ""

echo "Verifying changelog was updated..."
if [ $CHANGELOG_UPDATED -ne 1 ]; then
  echo "Changelog was not updated!"
  exit 1
else
  echo "Success!"
fi
echo ""

# verify the version does not yet have a tag
MAIN_VERSION="$(get_version_from_file packages/unmock-core/package.json)"
TAG_EXISTS=`git tag -l | grep $MAIN_VERSION\$ | wc -l`  # Ends as found in the package.json (no additional suffixes)
echo "Verifying tag for ${MAIN_VERSION} doesn't exist..."
if [ $TAG_EXISTS -ne 0 ]; then
  echo "Current version (declared by unmock-core) already has a tag! Did you update the packages' version?"
  exit 1
else
  echo "Success!"
fi
echo ""

# verify the version is sync'd across packages
echo "Verifying version ($MAIN_VERSION) is synchronized across monorepo"
for f in "lerna.json" "packages/unmock/package.json" "packages/unmock-cli/package.json" "packages/unmock-jsdom/package.json" "packages/unmock-node/package.json"; do
  CUR_VERSION="$(get_version_from_file $f)"
  if [ "$CUR_VERSION" != "$MAIN_VERSION" ]; then
    echo "Found mismatched version '${CUR_VERSION}', declared in '${f}'"
    exit 1
  fi
done
echo "Success!"
echo ""


# verify the new version appears in changelog
VERSION_IN_CHANGELOG=`grep ${MAIN_VERSION} changelog.md | wc -l`
echo "Verifying ${MAIN_VERSION} appears in changelog.md"
if [ $VERSION_IN_CHANGELOG -eq 0 ]; then
  echo "The new version (${MAIN_VERSION}) does not appear in changelog.md!"
  exit 1
else
  echo "Success!"
fi
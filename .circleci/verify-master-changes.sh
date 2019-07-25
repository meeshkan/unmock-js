#!/bin/bash

if [ $# -eq 1 ]; then
  # verify the files were changed
  PACKAGES_CHANGED=`git diff --name-only master $1 | grep package.json`
  CHANGELOG_UPDATED=`git diff --name-only master $1 | grep changelog.md | wc -l`
  N_PACKAGES_CHANGED=`echo $PACKAGES_CHANGED | wc -w`
  N_PACKAGES=`ls packages | wc -w`

  if [ $N_PACKAGES_CHANGED -lt $N_PACKAGES ]; then
    echo "package.json was not updated across our monorepo!"
    exit 1
  elif [ $CHANGELOG_UPDATED -ne 1 ]; then
    echo "Changelog was not updated!"
    exit 1
  fi

  # verify the version does not yet have a tag
  MAIN_VERSION=`cat packages/unmock-core/package.json | grep version | awk 'BEGIN { FS="\"" } { print $4 }'`
  TAG_EXISTS=`git tag -l | grep $MAIN_VERSION | wc -l`
  if [ $TAG_EXISTS -eq 1 ]; then
    echo "Current version (declared under unmock-core) already has a tag! Did you update the packages' version?"
    exit 1
  fi

  # verify the new version appears in changelog
  VERSION_IN_CHANGELOG=`grep ${MAIN_VERSION} changelog.md`
  if [ $? -ne 0 ]; then
    echo "The new version (${MAIN_VERSION}) does not appear in changelog.md!"
    exit 1
  fi
else
  echo "Some CircleCI error - did recieve a branch to compare with master"
  exit 1
fi

exit 0
#!/bin/bash

VERSION=$(python scarlet/__init__.py)

rm -rf dist/*

python setup.py sdist bdist_wheel

twine upload dist/scarlet-${VERSION}.tar.gz

git flow release finish $VERSION

git tag $VERSION

git push --tags

git checkout master 

git merge develop



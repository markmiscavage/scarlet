#!/bin/bash

rm -rf dist/*

python setup.py sdist bdist_wheel

VERSION=$(python scarlet/__init__.py)

twine upload dist/scarlet-${VERSION}.tar.gz

git tag $VERSION

git push --tags


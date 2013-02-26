#!/bin/bash
set +e

grunt build
if [ $? -eq 0 ]; then
    exit 0
fi

ROBYN=$(which robyn)

if [ -z $ROBYN ]; then
    echo "Robyn not found. See http://github.com/ff0000/robyn-cli"
    exit 1
fi

set -e

BASE="$(dirname $0)"
PWD=$(pwd)
if [ $BASE = "." ]; then
    BASE="$PWD"
fi

if [ -d builder ]; then
    echo "Build project exists"
    cd builder
else
    BRANCH="feature/scarlet-plugin"
    echo '\n' | robyn add rbp https://github.com/ff0000/red-boilerplate.git
    echo 'y\nN\n\n\n' | robyn init rbp builder --branch $BRANCH --title builder --name builder --include-plugins caboose,rosy,modenizer

    cd builder
    grunt start --branch $BRANCH --title builder --name builder --include-plugins caboose,rosy,modenizer
    ln -sf "$BASE/../" scarlet
    grunt install:scarlet
fi

grunt build --tasks "$BASE/tasks"

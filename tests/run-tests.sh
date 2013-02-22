#!/bin/bash

set +e
TESTDIR="$(dirname $0)"
COVERAGE=$(which coverage)
TEST_RUNNER=$( which django-admin.py )
SETTINGS="settings"

PWD=$(pwd)
if [ $TESTDIR = "." ]; then
    PYPATH="$PWD"
else
    PYPATH="$PWD:$PWD/$TESTDIR"
fi
PYPATH="$PYPATH:$PWD/$TESTDIR/../scarlet"
if [ -z $PYTHONPATH ]; then
    PYTHONPATH="$PYPATH"
else
    PYTHONPATH="$PYPATH:$PYTHONPATH"
fi

export PYTHONPATH

if [ -z $TEST_RUNNER ]; then
    echo "django-admin command not found"
    exit 1
fi

set -e

usage()
{
    echo "run-tests.sh [-s or --settings or --settings=] [test-to-run]"
    exit $1
}

branch="master"
while :
do
    case $1 in
        -h | --help | -\?)
            usage 0
            ;;
        -s | --skip-static | -\?)
            skipstatic=1
            shift
            ;;
        -s | --settings)
            SETTINGS=$2
            shift 2
            ;;
         --settings=*)
            SETTINGS=${1#*=}
            shift
            ;;
        --) # End of all options
            shift
            break
            ;;
        -*)
            usage 1
            shift
            ;;
        *)  # no more options. Stop while loop
            break
            ;;
    esac
done

if [ -n $COVERAGE ]; then
    TEST_RUNNER="$COVERAGE run --source=$TESTDIR/../scarlet -- $TEST_RUNNER"
fi

test_to_run=$1
if [ -z $test_to_run ]; then
    files=$(ls $TESTDIR)
    for file in $files; do
        if [ -d "$TESTDIR/$file" ]; then
            $TEST_RUNNER test "$file" "--settings=$SETTINGS"
        fi
    done
else
    echo "$TEST_RUNNER test $test_to_run --settings=$SETTINGS"
    $TEST_RUNNER test "$test_to_run" "--settings=$SETTINGS"
fi

if [ -n $COVERAGE ]; then
    $COVERAGE report -m
fi

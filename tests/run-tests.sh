#!/bin/bash

set +e
TESTDIR="$(dirname $0)"
COVERAGE=$(which coverage)
SETTINGS=""
TEST_RUNNER="run_tests.py"

PWD=$(pwd)
if [ $TESTDIR = "." ]; then
    echo "already in dir"
else
    TEST_RUNNER="$TESTDIR/run_tests.py"
fi

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

if [ $COVERAGE ]; then
    TEST_RUNNER="$COVERAGE run -a --source=$TESTDIR/../scarlet -- $TEST_RUNNER"
fi

test_to_run=$1
if [ -z $test_to_run ]; then
    $TEST_RUNNER "--settings" "$SETTINGS"
else
    $TEST_RUNNER "--settings" "$SETTINGS" "$test_to_run"
fi

if [ $COVERAGE ]; then
    $COVERAGE report -m
fi

# Run tests

echo Running tests...

if [ "$TESTS" == "" ]; then
    TESTS="./test/test_*.js"
fi

NODE_ENV=test ./node_modules/.bin/mocha $TESTS --reporter list --timeout 120s

TEST_STATUS=$?

echo Done!

exit $TEST_STATUS
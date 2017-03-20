/* global it, describe */
const assert = require('chai').assert;

const langGetter = require('../index');

describe('Tests', () => {
    it('should return the language makeup of a user\'s repositories, in bytes', (done) => {
        langGetter.getRepoLanguages('public', process.env.GITHUB_ACCESS_TOKEN).then((result) => {
            Object.keys(result).forEach((key) => {
                assert.typeOf(key, 'String');
                assert.typeOf(result[key], 'Number');
            });
            done();
        });
    });

    it('should fail return repo language makeup due to access token error', (done) => {
        langGetter.getRepoLanguages('public', 'FAKE-ACCESS-TOKEN').catch((err) => {
            assert.equal(err.statusCode, 401);
            assert.equal(err.error.message, 'Bad credentials');
            done();
        });
    });

    it('should return the language makeup of a user\'s commits, in bytes', (done) => {
        langGetter.getCommitLanguages('public', process.env.GITHUB_ACCESS_TOKEN).then((result) => {
            Object.keys(result).forEach((key) => {
                assert.typeOf(key, 'String');
                assert.typeOf(result[key], 'Number');
            });
            done();
        });
    });

    it('should fail return commit language makeup due to access token error', (done) => {
        langGetter.getCommitLanguages('public', 'FAKE-ACCESS-TOKEN').catch((err) => {
            assert.equal(err.statusCode, 401);
            assert.equal(err.error.message, 'Bad credentials');
            done();
        });
    });
});

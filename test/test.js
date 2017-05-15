/* global it, describe */
const assert = require('chai').assert;

const langGetter = require('../src/index');

describe('Tests for getRepoLanguages', () => {
    it('should return the language makeup of a user\'s repositories, in bytes', (done) => {
        langGetter.getRepoLanguages(process.env.GITHUB_ACCESS_TOKEN).then((result) => {
            Object.keys(result).forEach((key) => {
                assert.typeOf(key, 'String');
                assert.typeOf(result[key], 'Number');
            });
            done();
        });
    });

    it('should fail to return repo language makeup due to access token error', (done) => {
        langGetter.getRepoLanguages('FAKE-ACCESS-TOKEN').catch((err) => {
            assert.equal(err.statusCode, 401);
            assert.equal(err.error.message, 'Bad credentials');
            done();
        });
    });

    it('should return the repo languages for only public repositories', (done) => {
        let options = { visibility: 'public' }
        langGetter.getRepoLanguages(process.env.GITHUB_ACCESS_TOKEN, options).then((result) => {
            Object.keys(result).forEach((key) => {
                assert.typeOf(key, 'String');
                assert.typeOf(result[key], 'Number');
            });
            done();
        });
    });

    it('should return the repo languages for repos where the user is the owner', (done) => {
        let options = { affiliation: ['owner'] }
        langGetter.getRepoLanguages(process.env.GITHUB_ACCESS_TOKEN, options).then((result) => {
            Object.keys(result).forEach((key) => {
                assert.typeOf(key, 'String');
                assert.typeOf(result[key], 'Number');
            });
            done();
        });
    });
});

describe('Tests for getRepoLanguagesByUsername', () => {
    it('should use username to return the language makeup of a user\'s repositories, in bytes', (done) => {
        langGetter.getRepoLanguagesByUsername(process.env.GITHUB_ACCESS_TOKEN, process.env.GITHUB_USERNAME).then((result) => {
            Object.keys(result).forEach((key) => {
                assert.typeOf(key, 'String');
                assert.typeOf(result[key], 'Number');
            });
            done();
        });
    });

    it('should fail to return repo language makeup due to unfound username', (done) => {
        langGetter.getRepoLanguagesByUsername(process.env.GITHUB_ACCESS_TOKEN, 'FAKE-GITHUB-USERNAME').catch((err) => {
            assert.equal(err.statusCode, 404);
            assert.equal(err.error.message, 'Not Found');
            done();
        });
    });
});

describe('Tests for getCommitLanguages', () => {
    it('should return the language makeup of a user\'s commits, in bytes', (done) => {
        langGetter.getCommitLanguages(process.env.GITHUB_ACCESS_TOKEN).then((result) => {
            Object.keys(result).forEach((key) => {
                assert.typeOf(key, 'String');
                assert.typeOf(result[key], 'Object');
                var resultObj = result[key];
                assert.property(resultObj, 'commits');
                assert.property(resultObj, 'bytes');
                assert.typeOf(resultObj.commits, 'Number');
                assert.typeOf(resultObj.bytes, 'Number');
            });
            done();
        });
    });

    it('should fail return commit language makeup due to access token error', (done) => {
        langGetter.getCommitLanguages('FAKE-ACCESS-TOKEN').catch((err) => {
            assert.equal(err.statusCode, 401);
            assert.equal(err.error.message, 'Bad credentials');
            done();
        });
    });
});

describe('Tests for getCommitLanguagesByUsername', () => {
    it('should use username to return the language makeup of a user\'s commits, in bytes', (done) => {
        langGetter.getCommitLanguagesByUsername(process.env.GITHUB_ACCESS_TOKEN, process.env.GITHUB_USERNAME).then((result) => {
            Object.keys(result).forEach((key) => {
                assert.typeOf(key, 'String');
                assert.typeOf(result[key], 'Object');
                const resultObj = result[key];
                assert.property(resultObj, 'commits');
                assert.property(resultObj, 'bytes');
                assert.typeOf(resultObj.commits, 'Number');
                assert.typeOf(resultObj.bytes, 'Number');
            });
            done();
        });
    });

    it('should fail to return commit language makeup due to unfound username', (done) => {
        langGetter.getCommitLanguagesByUsername(process.env.GITHUB_ACCESS_TOKEN, 'FAKE-GITHUB-USERNAME').catch((err) => {
            assert.equal(err.statusCode, 404);
            assert.equal(err.error.message, 'Not Found');
            done();
        });
    });
});

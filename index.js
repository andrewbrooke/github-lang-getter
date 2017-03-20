require('dotenv').config();

const _ = require('lodash');
const async = require('async');
const detect = require('language-detect');
const different = require('different');
const inspector = require('schema-inspector');
const request = require('request-promise-native');

const API_BASE_URL = 'https://api.github.com';

// Standard options for making requests to Github API
const baseOpts = {
    headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Request-Promise'
    },
    json: true
};

/**
 * Gets a Github user's repository programming language distribution
 * @param  {String} visibility Type of repositories to find (can be all, public, or private)
 * @param  {Object} token Github personal access token
 * @return {Promise}            Resolves if API request performed successfully
 *                              Rejects if parameters are invalid, or error occurs with API request
 */
exports.getRepoLanguages = (visibility = 'public', token) => {
    return new Promise((resolve, reject) => {
        getUserRepos(visibility, token).then((repos) => {
            var urls = _.map(repos, 'languages_url');
            // Push a function for each URL to get the languages byte count, and process them asynchronously
            var funcs = _.map(urls, _.curry(createAPIRequestFunc)(token));
            async.parallel(funcs, (err, results) => {
                if (err) reject(err);
                // Count bytes per language
                var totals = {};
                _.each(results, (obj) => {
                    _.each(obj, (val, key) => {
                        if (!totals[key]) totals[key] = 0;
                        totals[key] += obj[key];
                    });
                });
                resolve(totals);
            });
        }).catch((err) => {
            reject(err);
        });
    });
};

/**
 * Gets a Github user's repository programming language distribution
 * @param  {String} visibility Type of repositories to find (can be all, public, or private)
 * @param  {Object} token Github personal access token
 * @return {Promise}            Resolves if API request performed successfully
 *                              Rejects if parameters are invalid, or error occurs with API request
 */
exports.getCommitLanguages = (visibility = 'public', token) => {
    return new Promise((resolve, reject) => {
        getUserRepos(visibility, token).then((repos) => {
            // Get Github username from access token
            var options = _.defaults({
                uri: API_BASE_URL + '/user',
                qs: {
                    access_token: token, // eslint-disable-line
                }
            }, baseOpts);

            // Perform API request and handle result appropriately
            request(options).then((user) => {
                // Get Repo commit URLs
                var urls = _.map(repos, (repo) => {
                    return repo.url + '/commits'
                });
                // TODO: account for pagination in the Github API
                var funcs = _.map(urls, _.curry(createAPIRequestFunc)(token));
                async.parallelPlus(funcs, (err, results) => { // eslint-disable-line
                    // Filter out undefined results
                    var commitArrays = _.filter(results, (result) => {
                        return result !== undefined;
                    });
                    var commits = [];
                    // For each array of commits
                    _.each(commitArrays, (commitArray) => {
                        // Filter out commits that don't belong to the user
                        commits = commits.concat(_.filter(commitArray, (c) => {
                            return c && c.committer && c.committer.id === user.id;
                        }));
                    });
                    var totals = {};

                    // Get individual commit data from API
                    var urls = _.map(commits, 'url');
                    var funcs = _.map(urls, _.curry(createAPIRequestFunc)(token));
                    async.parallel(funcs, (err, commits) => { // eslint-disable-line
                        _.each(commits, (commit) => {
                            _.each(commit.files, (file) => {
                                // TODO: make sure these language names match up with the ones returned from Github API
                                var language = detect.filename(file.filename);
                                if (language) {
                                    // Parse Git diff
                                    different.parseDiffFromString('diff\n' + file.patch, (diff) => {
                                        // Sum number of bytes from additions and add to results
                                        var byteCount = _.reduce(diff[0].additions, (sum, line) => {
                                            return line.length;
                                        }, 0);
                                        if (!totals[language]) totals[language] = 0;
                                        totals[language] += byteCount;
                                    });
                                }
                            });
                        });
                        resolve(totals);
                    });
                });
            }).catch((err) => {
                reject(err);
            });
        }).catch((err) => {
            reject(err);
        });
    });
};

/**
 * Gets a list of Github user's repositories from the Github API
 * @param  {String} visibility Type of repositories to find (can be all, public, or private)
 * @param  {String} token   Github personal access token
 * @return {Promise}        Resolves if repo URLs are obtained
 *                          Rejects if an error occurs obtaining URLs
 */
function getUserRepos(visibility = 'public', token) {
    // TODO: account for pagination in the Github API
    return new Promise((resolve, reject) => {
        // First validate the user input
        var validation = {
            type: 'string'
        };
        var result = inspector.validate(validation, token);
        if (!result.valid) throw Error(result.format());

        // Form options for API request
        var options = _.defaults({
            uri: API_BASE_URL + '/user/repos',
            qs: {
                access_token: token, // eslint-disable-line
                visibility: visibility
            }
        }, baseOpts);

        // Perform API request and handle result appropriately
        request(options).then((repos) => {
            resolve(repos);
        }).catch((err) => {
            reject(err);
        });
    });
}

/**
 * Creates and returns a function to be used to get the language makeup for a specific Github repo
 * @param  {String} token   Github personal access token
 * @param  {String} repoUrl Github repository URL
 * @return {Function}       Function to be passed into Async call with callback
 */
function createAPIRequestFunc(token, repoUrl) {
    return function(callback) {
        // Form options for API request
        var options = _.defaults({
            uri: repoUrl,
            qs: {
                access_token: token, // eslint-disable-line
                per_page: 100 // eslint-disable-line
            }
        }, baseOpts);

        // Perform API request and handle result appropriately
        request(options).then((result) => {
            callback(null, result);
        }).catch((err) => {
            callback(err);
        });
    }
}

/**
 * Addition to Async parallel method to prevent function chain from breaking on failure
 * @param  {[type]}   functions List of functions to execute
 * @param  {Function} callback  Callback function
 * @return {Function}           Async parallel method to execute
 */
async.parallelPlus = function(functions, callback) {
    function wrap(func) {
        return function(callback) {
            func(function(err, value) {
                if (err) return callback(null, false);

                return callback(null, value);
            });
        }
    }
    var newFunctions = {};
    for (var func in functions) {
        if (Object.prototype.hasOwnProperty.call(functions, func)) {
            newFunctions[func] = wrap(functions[func]);
        }
    }

    return async.parallel(newFunctions, callback);
}

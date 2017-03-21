require('dotenv').config();

const _ = require('lodash');
const Promise = require("bluebird");
const detect = require('language-detect');
const different = require('different');
const inspector = require('schema-inspector');
const parse = require('parse-link-header');
const request = require('request-promise-native');

const API_BASE_URL = 'https://api.github.com';

// Standard options for making requests to Github API
const baseOpts = {
    headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Request-Promise'
    },
    json: true,
    resolveWithFullResponse: true
};

/**
 * Gets a Github user's repository programming language distribution
 * @param  {String} visibility  Type of repositories to find (can be all, public, or private)
 * @param  {Object} token       Github personal access token
 * @return {Promise}            Resolves if API request performed successfully
 *                              Rejects if parameters are invalid, or error occurs with API request
 */
exports.getRepoLanguages = (visibility, token) => {
    return getUserRepos(visibility, token).then((responses) => {
        var repos = [];
        _.each(responses, (response) => {
            repos = repos.concat(response.body);
        });
        var urls = _.map(repos, 'languages_url');
        // Push a function for each URL to get the languages byte count, and process them asynchronously
        var promises = _.map(urls, _.curry(createAPIRequestPromise)(token, null));

        return Promise.all(promises);
    }).then((responses) => {
        var results = _.map(responses, 'body');
        // Count bytes per language
        var totals = {};
        _.each(results, (obj) => {
            _.each(obj, (val, key) => {
                if (!totals[key]) totals[key] = 0;
                totals[key] += obj[key];
            });
        });

        return totals;
    });
};

/**
 * Gets a Github user's repository programming language distribution
 * @param  {String} visibility  Type of repositories to find (can be all, public, or private)
 * @param  {Object} token       Github personal access token
 * @return {Promise}            Resolves if API request performed successfully
 *                              Rejects if parameters are invalid, or error occurs with API request
 */
exports.getCommitLanguages = (visibility, token) => {
    // First get the user's repositories
    return getUserRepos(visibility, token).then((repos) => {
        var options = _.defaults({
            uri: API_BASE_URL + '/user',
            qs: {
                access_token: token, // eslint-disable-line
            },
            resolveWithFullResponse: false
        }, baseOpts);

        // Get Github username from access token
        return request(options).then((user) => {
            // Get Repo commit URLs
            var urls = _.map(repos, (repo) => {
                return repo.url + '/commits'
            });

            var funcs = _.map(urls, _.curry(getRepoCommits)(user.login, token));

            // eslint-disable-next-line
            return new Promise((resolve, reject) => { // Promise wrapper for callback-driven routine
                async.parallelPlus(funcs, (err, results) => { // eslint-disable-line
                    // Filter out undefined results
                    var commitArrays = _.filter(results, (result) => {
                        return result !== undefined;
                    });
                    var commits = [];
                    // For each array of commits
                    _.each(commitArrays, (commitArray) => {
                        // Filter out commits that don't belong to the user
                        commits = commits.concat(commitArray);
                    });

                    // Get individual commit data from API
                    var urls = _.filter(_.map(commits, 'url'), (c) => {
                        return c !== undefined;
                    });
                    var promises = _.map(urls, _.curry(createAPIRequestPromise)(token, null));
                    resolve(Promise.all(promises));
                });
            }).then((responses) => {
                var totals = {};
                var commits = _.map(responses, 'body');
                _.each(commits, (commit) => {
                    _.each(commit.files, (file) => {
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

                return totals;
            });
        });
    });
};

/**
 * Gets a list of Github user's repositories from the Github API
 * @param  {String} visibility  Type of repositories to find (can be all, public, or private)
 * @param  {String} token       Github personal access token
 * @return {Promise}            Resolves if repo URLs are obtained
 *                              Rejects if an error occurs obtaining URLs
 */
function getUserRepos(visibility, token) {
    // First validate the user input
    var validation = {
        type: 'string'
    };
    var result = inspector.validate(validation, token);
    if (!result.valid) throw Error(result.format());

    // Form options for API request
    var url = API_BASE_URL + '/user/repos';
    var options = _.defaults({
        uri: url,
        qs: {
            access_token: token, // eslint-disable-line
            per_page: 100, // eslint-disable-line
            visibility: visibility
        }
    }, baseOpts);

    // Perform API request and handle result appropriately
    return request(options).then((response) => { // eslint-disable-line
        var link = parse(response.headers.link);
        var promises = []; // To store the promises to resolve the other pages of repos
        if (link) { // Get the other pages of results if necessary
            var start = Number(link.next.page), end = Number(link.last.page);
            for (var page = start; page <= end; page++) {
                promises.push(_.curry(createAPIRequestPromise)(token, page, url))
            }
        }
        promises.push(_.curry(createAPIRequestPromise)(token, 1, url))

        return Promise.all(promises);
    });
}

/**
 * Creates and returns a function to be used to get all of the commits for a Github repo
 * @param  {String} username    Github username
 * @param  {String} token       Github personal access token
 * @param  {String} repoUrl     Github repository URL
 * @return {Function}           Function to be passed into Async call with callback
 */
function getRepoCommits(username, token, repoUrl) {
    return function(callback) {
        // Form options for API request
        var options = _.defaults({
            uri: repoUrl,
            qs: {
                access_token: token, // eslint-disable-line
                per_page: 100, // eslint-disable-line
            }
        }, baseOpts);
        if (username) options.qs.author = username;

        // Perform API request and handle result appropriately
        request(options).then((response) => { // eslint-disable-line
            var repos = response.body;
            var link = parse(response.headers.link);
            if (link) { // Get the other pages of results if necessary
                var funcs = []; // To store the functions that we pass in to Async parallel
                var start = Number(link.next.page);
                var end = Number(link.last.page);
                for (var page = start; page <= end; page++) {
                    funcs.push(_.curry(createAPIRequestFunc)(token, page, repoUrl));
                }
                async.parallelPlus(funcs, (err, results) => { // eslint-disable-line
                    _.each(results, (result) => {
                        repos = repos.concat(result.body);
                    });

                    return callback(null, repos);
                });
            } else {
                return callback(null, repos);
            }
        }).catch((err) => {
            return callback(err);
        });
    }
}

/**
 * Creates and returns a function to be used to get the language makeup for a specific Github repo
 * @param  {String} token   Github personal access token
 * @param  {Integer} page   Used for pagination, can be undefined
 * @param  {String} url     Github API URL
 * @return {Promise}        Promise to be passed into Promise.all()
 */
function createAPIRequestPromise(token, page, url) {
    // Form options for API request
    var options = _.defaults({
        uri: url,
        qs: {
            access_token: token, // eslint-disable-line
            per_page: 100, // eslint-disable-line
        }
    }, baseOpts);
    if (page) options.qs.page = page;

    // Perform API request and handle result appropriately
    return request(options);
}

require('dotenv').config();

const _ = require('lodash');
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
    qs: {
        per_page: 100, // eslint-disable-line
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
    // First get the User's repositories
    return getUserRepos(visibility, token).then((responses) => {
        // Parse the repos json from the response bodies
        let repos = [];
        _.each(responses, (response) => {
            repos = repos.concat(response.body);
        });

        // Map Promises for each URL to resolve to the total language byte count
        const urls = _.map(repos, 'languages_url');
        const promises = _.map(urls, _.curry(createAPIRequestPromise)(token, null));

        return Promise.all(promises);
    }).then((responses) => {
        const results = _.map(responses, 'body');

        // Count bytes per language
        const totals = {};
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
 * Gets a Github user's commit programming language distribution
 * @param  {String} visibility  Type of repositories to find (can be all, public, or private)
 * @param  {Object} token       Github personal access token
 * @return {Promise}            Resolves if API request performed successfully
 *                              Rejects if parameters are invalid, or error occurs with API request
 */
exports.getCommitLanguages = (visibility, token) => {
    // First get the user's repositories
    return getUserRepos(visibility, token).then((responses) => {
        // Parse the repos json from the response bodies
        let repos = [];
        _.each(responses, (response) => {
            repos = repos.concat(response.body);
        });

        const options = _.defaultsDeep({
            uri: API_BASE_URL + '/user',
            qs: {
                access_token: token, // eslint-disable-line
            },
            resolveWithFullResponse: false
        }, baseOpts);

        // Get Github username from access token
        return request(options).then((user) => {
            // Get Repo commit URLs
            const urls = _.map(repos, (repo) => {
                return repo.url + '/commits'
            });

            // Map a Promise for each repo commit URL
            let promises = _.map(urls, _.curry(getRepoCommits)(user.login, token));
            promises = promises.map((p) => p.then((v) => v, (e) => ({ error: e })));

            return Promise.all(promises).then((results) => {
                let commits = [];

                // Get commits from Promise reponses
                results.forEach((result) => {
                    if (result.error) {
                        // TODO: Promise may be rejected in certain cases should we do anything here?
                    } else {
                        _.each(result, (value) => {
                            commits = commits.concat(value.body);
                        });
                    }
                });

                // Map a promise for each individual commit URL
                const urls = _.chain(commits).filter((c) => {
                                return c && c.author && c.author.login === user.login;
                            }).map('url').value();

                const promises = _.map(urls, _.curry(createAPIRequestPromise)(token, null));

                return Promise.all(promises);
            }).then((responses) => {
                const commits = _.map(responses, 'body');
                const totals = {};

                // For each file in the commit files
                _.each(commits, (commit) => {
                    const commitLangs = []; // Store all the languages present in commit
                    _.each(commit.files, (file) => {
                        const language = detect.filename(file.filename);
                        if (language) {
                            // Create empty object to hold total values
                            if (!totals[language]) totals[language] = {
                                bytes: 0,
                                commits: 0
                            };

                            // Add one to the language commit count if we haven't already
                            if (!commitLangs.includes(language)) {
                                commitLangs.push(language);
                                totals[language].commits += 1;
                            }

                            // Parse Git diff
                            different.parseDiffFromString('diff\n' + file.patch, (diff) => {
                                // Sum number of bytes from additions and add to results
                                const byteCount = _.reduce(diff[0].additions, (sum, line) => {
                                    return line.length;
                                }, 0);

                                totals[language].bytes += byteCount;
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
    // First validate the user token input
    const validation = {
        type: 'string'
    };
    const result = inspector.validate(validation, token);
    if (!result.valid) throw Error(result.format());

    // Form options for API request
    const url = API_BASE_URL + '/user/repos';
    const options = _.defaultsDeep({
        uri: url,
        qs: {
            access_token: token, // eslint-disable-line
            visibility: visibility
        }
    }, baseOpts);

    return request(options).then((response) => { // eslint-disable-line
        const link = parse(response.headers.link);
        const promises = []; // To store the promises to resolve the other pages of repos

        if (link) { // Get the other pages of results if necessary
            const start = Number(link.next.page), end = Number(link.last.page);
            for (let page = start; page <= end; page++) {
                promises.push(_.curry(createAPIRequestPromise)(token, {
                    page: page,
                    visibility: visibility
                }, url));
            }
        }
        promises.push(_.curry(createAPIRequestPromise)(token, {
            page: 1,
            visibility: visibility
        }, url));

        return Promise.all(promises);
    });
}

/**
 * Creates and returns a promise to resolve to all of the commits for a Github repo
 * @param  {String} username    Github username
 * @param  {String} token       Github personal access token
 * @param  {String} repoUrl     Github repository URL
 * @return {Promise}            Promise to resolve repo commits
 */
function getRepoCommits(username, token, repoUrl) {
    // Form options for API request
    const options = _.defaultsDeep({
        uri: repoUrl,
        qs: {
            access_token: token, // eslint-disable-line
        }
    }, baseOpts);
    if (username) options.qs.author = username;

    return request(options).then((response) => { // eslint-disable-line
        const promises = []; // To store the promises to resolve the other pages of commits
        const link = parse(response.headers.link);

        if (link) { // Get the other pages of results if necessary
            const start = Number(link.next.page), end = Number(link.last.page);
            for (let page = start; page <= end; page++) {
                promises.push(_.curry(createAPIRequestPromise)(token, {
                    page: page,
                    author: username
                }, repoUrl));
            }
        }
        promises.push(_.curry(createAPIRequestPromise)(token, {
            page: 1,
            author: username
        }, repoUrl));

        return Promise.all(promises);
    });
}

/**
 * Creates and returns a promise to resolve to a specific Github API request result
 * @param  {String} token   Github personal access token
 * @param  {Object} qs      Extra query string parameters
 * @param  {String} url     Github API URL
 * @return {Promise}        Promise to be resolved somewhere
 */
function createAPIRequestPromise(token, qs, url) {
    // Form options for API request
    const options = _.defaultsDeep({
        uri: url,
        qs: {
            access_token: token, // eslint-disable-line
        }
    }, baseOpts);
    if (qs) {
        for (let key in qs) {
            if (Object.prototype.hasOwnProperty.call(qs, key))
                options.qs[key] = qs[key];
        }
    }

    // Perform API request and handle result appropriately
    return request(options);
}

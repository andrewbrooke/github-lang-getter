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
module.exports.getRepoLanguages = async (visibility, token) => {
    // First get the User's repositories
    const repoResponses = await getUserRepos(null, visibility, token);

    // Parse repos and return the user's repository programming language distribution
    return getRepoLanguageTotals(repoResponses, token);
};

/**
 * Gets a GitHub user's repository programming language distribution
 * @param  {String} username    GitHub username
 * @param  {Object} token       Github personal access token
 * @return {Promise}            Resolves if API request performed successfully
 *                              Rejects if parameters are invalid, or error occurs with API request
 */
module.exports.getRepoLanguagesByUsername = async (username, token) => {
    // Get user's repositories
    const repoResponses = await getUserRepos(username, 'public', token);

    // Parse repos and return the user's repository programming language distribution
    return getRepoLanguageTotals(repoResponses);
};

/**
 * Gets a Github user's commit programming language distribution
 * @param  {String} visibility  Type of repositories to find (can be all, public, or private)
 * @param  {Object} token       Github personal access token
 * @return {Promise}            Resolves if API request performed successfully
 *                              Rejects if parameters are invalid, or error occurs with API request
 */
module.exports.getCommitLanguages = async (visibility, token) => {
    // First get the user's repositories
    const repoResponses = await getUserRepos(null, visibility, token);

    // Parse repo commits and return user's commit programming lanugage distribution
    return getCommitLanguageTotals(repoResponses, token);
};

/**
 * Gets a GitHub user's commit programming language distribution
 * @param  {String} username    GitHub username
 * @param  {Object} token       Github personal access token
 * @return {Promise}            Resolves if API request performed successfully
 *                              Rejects if parameters are invalid, or error occurs with API request
 */
module.exports.getCommitLanguagesByUsername = async (username, token) => {
    // Get user's repositories
    const repoResponses = await getUserRepos(username, 'public', token);

    // Parse repo commits and return user's commit programming lanugage distribution
    return getCommitLanguageTotals(repoResponses, token, username);
};

/**
 * Totals the programming language distribution from a user's repositories.
 * @param  {Array}  repoResponses  List of user's repositories from GitHub API
 * @param  {String} token          GitHub personal access token
 * @return {Object}                User's repo language data
 */
async function getRepoLanguageTotals(repoResponses, token) {
    // Parse the repos json from the response bodies
    const repos = _.flatMap(repoResponses, 'body');

    // Map Promises for each URL to resolve to the total language byte count
    const urls = _.map(repos, 'languages_url');
    const promises = _.map(urls, _.curry(createAPIRequestPromise)(token, null));

    // Resolve the Promises and map the responses
    const langResponses = await Promise.all(promises);
    const results = _.map(langResponses, 'body');

    // Count bytes per language
    const totals = {};
    _.each(results, (obj) => {
        _.each(obj, (val, key) => {
            if (!totals[key]) totals[key] = 0;
            totals[key] += obj[key];
        });
    });

    return totals;
}

/**
* Totals the programming language distribution from a user's commits.
* @param {Array}   repoResponses  List of user's repositories from GitHub API
* @param {String}  token          GitHub personal access token
* @param {String}  username       GitHub username
* @return {Object}                User's commit language data
*/
async function getCommitLanguageTotals(repoResponses, token, username) {
    // Parse the repos json from the response bodies
    const repos = _.flatMap(repoResponses, 'body');
    // Map repos to array of repo commits URLs
    const repoCommitUrls = _.map(repos, (repo) => {
        return repo.url + '/commits'
    });

    // Get URLs of all individual commits
    const commitUrls = await getCommitsFromRepos(repoCommitUrls, token, username);
    // Create Promises for individual commits
    const promises = _.map(commitUrls, _.curry(createAPIRequestPromise)(token, null));
    const commitResponses = await Promise.all(promises);

    // Parse the commits json from the response bodies
    const commits = _.map(commitResponses, 'body');

    // Map our result data and return it
    return mapCommitsToResult(commits);
}

/**
 * Gets the list of individual commit URLs from a list of repository URLs
 * @param  {String} repoUrls    Github repository URLs to find commits for
 * @param  {Object} token       Github personal access token
 * @param  {String} username    GitHub username
 * @return {Array}              List of individual commit URLs
 */
async function getCommitsFromRepos(repoUrls, token, username) {
    let user;

    // Set user to username if given
    if (username) user = username;
    else { // Get GitHub username from access token if username parameter is undefined
        const options = _.defaultsDeep({
            uri: API_BASE_URL + '/user',
            qs: {
                access_token: token, // eslint-disable-line
            },
            resolveWithFullResponse: false
        }, baseOpts);

        const userResponse = await request(options);
        user = userResponse.login;
    }

    // Map a Promise for each repo commit URL
    let promises = _.map(repoUrls, _.curry(getRepoCommits)(user, token));
    promises = promises.map((p) => p.then((v) => v, (e) => ({ error: e })));

    const responses = await Promise.all(promises);

    // Get commits from Promise reponse bodies
    let commitsLists = [];
    responses.forEach((result) => {
        if (result.error) {
            // TODO: Promise may be rejected in certain cases, should we do anything here?
        } else {
            _.each(result, (value) => {
                commitsLists = commitsLists.concat(value.body);
            });
        }
    });

    // Return array of individual commit urls
    return _.chain(commitsLists).filter((c) => {
        return c && c.author && c.author.login === user;
    }).map('url').value();
}

/**
 * Maps Github commit objects to language usage data
 * @param  {Array} commits   Commits to get data for
 * @return {Object}          Commits language usage data
 */
function mapCommitsToResult(commits) {
    const totals = {}; // To store our result data
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
}

/**
 * Gets a list of Github user's repositories from the Github API
 * @param  {String} username    GitHub username
 * @param  {String} visibility  Type of repositories to find (can be all, public, or private)
 * @param  {String} token       Github personal access token
 * @return {Promise}            Resolves if repo URLs are obtained
 *                              Rejects if an error occurs obtaining URLs
 */
 async function getUserRepos(username, visibility, token) {
     // Validate the user token input
     const validation = {
         type: 'string'
     };

     // Set validation result and URL based on given parameters
     let result, url = API_BASE_URL;
     if (username) {
         result = inspector.validate(validation, username);
         url = `${url}/users/${username}/repos`;
     } else {
         result = inspector.validate(validation, token);
         url = `${url}/user/repos`;
     }

     if (!result.valid) throw Error(result.format());

     // Form options for API request
     const options = _.defaultsDeep({
         uri: url,
         qs: {
             access_token: token, // eslint-disable-line
             visibility: visibility
         }
     }, baseOpts);

     const response = await request(options);
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

     // Return the first response plus the Promise that will resolve the rest
     return [response].concat(await Promise.all(promises));
 }

/**
 * Creates and returns a promise to resolve to all of the commits for a Github repo
 * @param  {String} username    Github username
 * @param  {String} token       Github personal access token
 * @param  {String} repoUrl     Github repository URL
 * @return {Promise}            Promise to resolve repo commits
 */
async function getRepoCommits(username, token, repoUrl) {
    // Form options for API request
    const options = _.defaultsDeep({
        uri: repoUrl,
        qs: {
            access_token: token, // eslint-disable-line
            author: username
        }
    }, baseOpts);

    const response = await request(options);
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

    // Return the first response plus the Promise that will resolve the rest
    return [response].concat(await Promise.all(promises));
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

    // Attach extra query string parameters to the request options
    if (qs) {
        for (let [key, val] of Object.entries(qs)) {
            options.qs[key] = val;
        }
    }

    // Perform API request and handle result appropriately
    return request(options);
}

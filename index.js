const _ = require('lodash');
const async = require('async');
const inspector = require('schema-inspector');
const request = require('request-promise-native');

/**
 * Gets a Github user's repository programming language distribution
 * @param  {String} visibility Type of repositories to find (can be all, public, or private)
 * @param  {Object} token Github personal access token
 * @return {Promise}            Resolves if API request performed successfully
 *                              Rejects if parameters are invalid, or error occurs with API request
 */
exports.getUserLanguages = (visibility = 'public', token) => {
    return new Promise((resolve, reject) => {
        // First validate the user input
        var validation = {
            type: 'string'
        };
        var result = inspector.validate(validation, token);
        if (!result.valid) throw Error(result.format());

        // Form options for API request
        var options = {
            uri: `https://api.github.com/user/repos`,
            qs: {
                access_token: token, // eslint-disable-line
                visibility: visibility
            },
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Request-Promise'
            },
            json: true
        };

        // Perform API request and handle result appropriately
        request(options).then((repos) => {
            var urls = _.map(repos, 'languages_url');
            // Push a function for each URL to get the languages byte count, and process them asynchronously
            var funcs = _.map(urls, _.curry(getRepoLanguages)(token));
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
 * [getRepoLanguages description]
 * @param  {String} token   Github personal access token
 * @param  {String} repoUrl Github repository URL to get languages for
 * @return {Function}       Function to be passed a callback to resolve
 *                                   request for repository languages
 */
function getRepoLanguages(token, repoUrl) {
    return function(callback) {
        // Form options for API request
        var options = {
            uri: repoUrl,
            qs: {
                access_token: token // eslint-disable-line
            },
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Request-Promise'
            },
            json: true
        };

        // Perform API request and handle result appropriately
        request(options).then((result) => {
            callback(null, result);
        }).catch((err) => {
            callback(err);
        });
    }
}

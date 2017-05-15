const langGetter = require('../src/index');

// Return the language makeup of a user's repositories, in bytes
langGetter.getRepoLanguages('YOUR-ACCESS-TOKEN', {
    visibility: 'all',
    affiliation: ['owner', 'collaborator']
}).then((result) => {
    console.log(result);
}).catch((err) => {
    console.log(err);
});

// Return the language makeup of a user's repositories, in bytes
langGetter.getRepoLanguagesByUsername('YOUR-ACCESS-TOKEN', 'GITHUB-USERNAME').then((result) => {
    console.log(result);
}).catch((err) => {
    console.log(err);
});

// Return the language makeup of a user's commits, in bytes
langGetter.getCommitLanguages('YOUR-ACCESS-TOKEN', {
    visibility: 'all',
    affiliation: ['owner', 'collaborator']
}).then((result) => {
    console.log(result);
}).catch((err) => {
    console.log(err);
});

// Return the language makeup of a user's commits, in bytes
langGetter.getCommitLanguagesByUsername('YOUR-ACCESS-TOKEN', 'GITHUB-USERNAME').then((result) => {
    console.log(result);
}).catch((err) => {
    console.log(err);
});

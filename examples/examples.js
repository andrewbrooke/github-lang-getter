const langGetter = require('../src/index');

// Return the language makeup of a user's repositories, in bytes
langGetter.getRepoLanguages('all', 'YOUR-ACCESS-TOKEN').then((result) => {
    console.log(result);
}).catch((err) => {
    console.log(err);
});

// Return the language makeup of a user's commits, in bytes
langGetter.getCommitLanguages('all', 'YOUR-ACCESS-TOKEN').then((result) => {
    console.log(result);
}).catch((err) => {
    console.log(err);
});

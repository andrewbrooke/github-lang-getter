const langGetter = require('../index');

// Return the language makeup of a user's repositories, in bytes
langGetter.getRepoLanguages('public', 'YOUR-ACCESS-TOKEN').then((result) => {
    console.log(result);
}).catch((err) => {
    console.log(err);
});

// Return the language makeup of a user's commits, in bytes
langGetter.getCommitLanguages('public', 'YOUR-ACCESS-TOKEN').then((result) => {
    console.log(result);
}).catch((err) => {
    console.log(err);
});

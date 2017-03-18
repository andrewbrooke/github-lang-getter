const langGetter = require('../index');

// Return the language makeup of a user's repositories, in bytes
langGetter.getRepoLanguages('all', 'YOUR-ACCESS-TOKEN').then((result) => {
    console.log(result);
}).catch((err) => {
    console.log(err);
});

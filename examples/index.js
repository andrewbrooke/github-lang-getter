const langGetter = require('../index');

langGetter.getUserLanguages('all', 'YOUR-ACCESS-TOKEN').then((result) => {
    console.log(result);
}).catch((err) => {
    console.log(err);
});

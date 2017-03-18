# github-lang-getter
A Node.JS module to retrieve a Github user's git contributions by programming language

## Usage

See examples in `/examples`

Install
`npm install --save github-lang-getter`

Import
`const langGetter = require('github-lang-getter');`

### Get Repository Language Composition

Return the language makeup of a user's repositories, in bytes

    var visibility = 'all'; // can be all, public, or private
    var token = 'YOUR-ACCESS-TOKEN'; // https://github.com/settings/tokens
    langGetter.getRepoLanguages(visibility, token).then((result) => {
        console.log(result);
    }).catch((err) => {
        console.log(err);
    });

Produces output like this

    {
      CSS: 2917838,
      HTML: 2198373,
      JavaScript: 19115215
    }

## Tests

    npm install
    npm test

## Contributing

Bug fixes and new features are encouraged, just fork and PR!

## License

[MIT](LICENSE)

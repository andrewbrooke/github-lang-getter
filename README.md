# github-lang-getter

A Node.JS module to retrieve a Github user's git contributions by programming language

## Usage

See examples in `/examples`

Install `npm install --save github-lang-getter`

Import `const langGetter = require('github-lang-getter');`

### Get Repository Language Composition

Return the language makeup of a user's repositories, in bytes

The numbers returned by this method reflect the number of bytes committed by all contributors.

```
var visibility = 'all'; // can be all, public, or private
var token = 'YOUR-ACCESS-TOKEN'; // https://github.com/settings/tokens
langGetter.getRepoLanguages(visibility, token).then((result) => {
    console.log(result);
}).catch((err) => {
    console.log(err);
});
```

Returns an object like

```
{
  CSS: 2194,
  HTML: 3627,
  JavaScript: 5909
}
```

### Get User's Commit Language Composition

Return the language makeup of a user's commits, in bytes

The numbers returned by this method reflect the number of bytes only committed by the user.

```
var visibility = 'all'; // can be all, public, or private
var token = 'YOUR-ACCESS-TOKEN'; // https://github.com/settings/tokens
langGetter.getCommitLanguages(visibility, token).then((result) => {
    console.log(result);
}).catch((err) => {
    console.log(err);
});
```

Returns an object like

```
{
  CSS: {
      bytes: 2194,
      commits: 12
  },
  HTML: {
      bytes: 3627,
      commits: 9
  },
  JavaScript: {
      bytes: 5909,
      commits: 16
  }
}
```

## Building

github-lang-getter uses Babel to build. Install the latest version of [Node.JS](https://nodejs.org/en/)

```
npm install
npm run build
```
The `npm run build` script transpiles all files in `/src` and outputs them in `/dist`

## Tests

Mocha tests are located in `/test`

To run the tests, create a `.env` file at the root directory with contents like the following:

```
GITHUB_ACCESS_TOKEN=YOUR-ACCESS-TOKEN
```

Run the following commands

```
npm install
npm test
```

## Contributing

Bug fixes and new features are encouraged, feel free to fork and make a pull request.

- Follow the ESLint rules set in .eslintrc.js
- Add Mocha tests for new functionality

## TODOS

- Improve API calls to prevent Github rate limit errors
- Find a way to exclude bytes in files that are a result of build processes
- Add methods to get language stats by Github username (only for public repos)

## License

[MIT](LICENSE)

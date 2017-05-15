# github-lang-getter

A Node.JS module to retrieve a Github user's git contributions by programming language

## Usage

See examples in `/examples`

Install `npm install --save github-lang-getter`

Import `const langGetter = require('github-lang-getter');`

### Get Repository Language Composition

Return the language makeup of a user's repositories, in bytes

NOTE: The numbers returned by these methods reflect the number of bytes committed by all contributors.

```
var token = 'YOUR-ACCESS-TOKEN'; // https://github.com/settings/tokens
langGetter.getRepoLanguages(token).then((result) => {
    console.log(result);
}).catch((err) => {
    console.log(err);
});
```

For `getRepoLanguages`, you can also supply an optional second parameter to specify the `visibility` and `affiliation` of repositories to find.
NOTE: Both `visibility` and `affiliation` are optional.

```
var token = 'YOUR-ACCESS-TOKEN'; // https://github.com/settings/tokens
var options = {
    visibility: 'all' // 'all', 'public', or 'private'
    affiliation: ['owner'] // combination of 'owner', 'collaborator', and 'organization_member'
};
langGetter.getRepoLanguages(token, options).then((result) => {
    console.log(result);
}).catch((err) => {
    console.log(err);
});
```

You can also use `getRepoLanguagesByUsername` to query for another user's language makeup.

```
var username = 'GITHUB-USERNAME';
var token = 'YOUR-ACCESS-TOKEN'; // https://github.com/settings/tokens
langGetter.getRepoLanguagesByUsername(token, username).then((result) => {
    console.log(result);
}).catch((err) => {
    console.log(err);
});
```

The above methods return an object similar to the following:

```
{
  CSS: 2194,
  HTML: 3627,
  JavaScript: 5909
}
```

### Get User's Commit Language Composition

Return the language makeup of a user's commits, in bytes

NOTE: The numbers returned by these methods reflect the number of bytes only committed by the user.

```
var token = 'YOUR-ACCESS-TOKEN'; // https://github.com/settings/tokens
langGetter.getCommitLanguages(token).then((result) => {
    console.log(result);
}).catch((err) => {
    console.log(err);
});
```

For `getCommitLanguages`, you can also supply an optional second parameter to specify the `visibility` and `affiliation` of repositories to find.
NOTE: Both `visibility` and `affiliation` are optional.

```
var token = 'YOUR-ACCESS-TOKEN'; // https://github.com/settings/tokens
var options = {
    visibility: 'all' // 'all', 'public', or 'private'
    affiliation: ['owner'] // combination of 'owner', 'collaborator', and 'organization_member'
};
langGetter.getCommitLanguages(token, options).then((result) => {
    console.log(result);
}).catch((err) => {
    console.log(err);
});
```

You can also use `getCommitLanguagesByUsername` to query for another user's language makeup.

```
var username = 'YOUR-USERNAME';
var token = 'YOUR-ACCESS-TOKEN'; // https://github.com/settings/tokens
langGetter.getCommitLanguagesByUsername(token, username).then((result) => {
    console.log(result);
}).catch((err) => {
    console.log(err);
});
```

The above methods return an object similar to the following:

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
GITHUB_USERNAME=YOUR-USERNAME
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

## CHANGELOG

[View changes here](CHANGELOG.md)

## TODOS

- Improve API calls to prevent Github rate limit errors
- Find a way to exclude bytes in files that are a result of build processes

## License

[MIT](LICENSE)

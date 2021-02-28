# Webpack Coverage Analyzer

Intersects Webpack Stats analysis with JavaScript Coverage reports to determine which modules are unused at runtime.

## Usage

1. Generate a Webpack Stats file using [Webpack's --json CLI](https://webpack.js.org/api/cli/#json) or [webpack-stats-plugin](https://www.npmjs.com/package/webpack-stats-plugin)
2. Boot your app in a Chromium browser (Chrome or Edge) and [use the DevTools to record code coverage](https://developers.google.com/web/tools/chrome-devtools/coverage). Export the coverage to a JSON file.
3. Run `npm run analyze -- coverage.json stats.json`
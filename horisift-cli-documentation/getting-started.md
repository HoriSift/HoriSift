# Getting started

The public npm registry package is **not yet published**. Clone [the official source repository](https://github.com/HoriSift/HoriSift) and use Node.js **22.12+ or 24.x** with npm.

```sh
git clone https://github.com/HoriSift/HoriSift.git
cd HoriSift
npm ci --ignore-scripts
npm run cli -- --help
npm run cli -- --version
npm run cli -- rules --format json
npm run cli -- scan ./your-local-stellar-app --format json
```

The scan reads supported JS/TS files and does not install the scanned app's packages or run its source. To scan a different directory, pass its local absolute or relative directory path.

You can reproduce a pinned upstream example:

```sh
npm run example -- axelar-faucet --format json --allow-incomplete
npm run example -- stellar-wind-legacy --format json
npm run test:public
```

The last example historically had a confirmed false negative. The current candidate flags the recognized legacy constructor as `LEGACY_SDK_SERVER`, reports `incomplete`, and exits 4. Broader historical API coverage remains open; a clean result is not proof of Horizon absence.

Source details: [README](https://github.com/HoriSift/HoriSift/blob/main/README.md) and [CLI usage](https://github.com/HoriSift/HoriSift/blob/main/docs/CLI_USAGE.md).

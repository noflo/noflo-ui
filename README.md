# NoFlo Development Environment

NoFlo Development Environment ("NoFlo UI") is a web-based IDE for flow-based programming with [NoFlo](https://noflojs.org) and other compatible FBP systems.

The aim is to handle the full lifecycle of flow-based software, from:
- **Sketching**: Using "dummy" placeholder nodes
- **Implementation**: Selecting libraries, writing code, or drawing subgraphs
- **Verification**: Adding/running tests via fbp-spec
- **Deployment**: Running on remote runtimes over FBP Protocol
- **Observability**: Seeing the state of runtimes. Setting tracepoints and traveling through dataflow via Flowtraces

The focus is on "live programming", being able to see and modify the behavior of an application as it runs.

The web application is designed to be offline-first, requiring no network connectivity except for connecting to remote FBP runtimes or collaborators.

## Status

The original, circa 2014 NoFlo UI is deprecated.
This new rewrite is only beginning.

## License

Licensed under the [EUPL 1.2](https://interoperable-europe.ec.europa.eu/collection/eupl/eupl-text-eupl-12).

## Development

This project is developed following [Reticulum Distributed Development](https://reticulum.network/manual/distributed.html) guidelines. The canonical source lives in `rns://adafb3153efd4d96d532568a5208b3b5/noflo/noflo-ui`.

See also the [project specification](SPEC.md).

### Running and developing

There is no build process for the project itself. To serve the files, run:

* `npm run serve`

Development happens the old-school way, just edit a file and press reload in the browser.

### Vendored dependecies

We aim for long-term maintainability. In support of that, we try to keep dependencies as minimal as possible.
The dependencies we have are to be vendored and committed into git.

*  `npm run build-vendors`

This should only be necessary when adding a new dependency or updating an existing one.

## Support NoFlo UI

This project was made possible by [1205 Kickstarter backers](http://noflojs.org/kickstarter/). We have additionally had both corporate support and EU R&D funding over the years.

Currently NoFlo UI is being developed as a passion project. To support development, here are some methods:

* Ethereum: `0xFC872bA86812B2bbe90c38cfD2553F7865d04094`
* Liberapay: https://liberapay.com/bergie/
* ko-fi: https://ko-fi.com/bergius

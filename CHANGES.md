NoFlo UI ChangeLog
==================

## 0.28.0 (git master)

Internal changes:

* Web Components are now modern JavaScript running on Polymer 3.x
* App build is now made out of multiple chunks to separate UI widgets and UI logic from each other
* Docker build of noflo-ui is now a multi-stage build to reduce image size
* Preview build of the latest noflo-ui `master` is now available in https://noflojs.org/noflo-ui
* Local development is now faster via `npm run dev`, powered by Webpack Dev Server
* Builds no longer include a zip file of noflo-ui. If a zip file is needed, simply grab the contents of the `browser` folder

## 0.27.10 (2020 October 07)

Bugfixes:

* WebRTC runtime addresses are shown in a nicer way
* Projects connected to an `opener` runtime can only be clicked when we have an opener context
* More consistent handling of graph IDs in live mode

## 0.27.9 (2020 October 02)

Bugfixes:

* Updated fbp-protocol-client to improve WebRTC runtime compatibility

## 0.27.8 (2020 September 30)

Bugfixes:

* Updated fbp-protocol-client to fix messaging issue with "opener" runtimes

## 0.27.7 (2020 September 25)

New features:

* fbp-spec test suites in a project get automatically executed against runtime when something is modified in the project
* fbp-spec suites are loaded and displayed when a project is opened
* fbp-spec executions are also shown in the runtime events screen

Bugfixes:

* Runtime selector works again
* Fixed project deletion not updating the UI
* Errors transmitted by runtime are again shown in the runtime events screen

## 0.27.6 (2020 September 24)

New features:

* Component specs received from a runtime are now shown in the UI
* Component spec changes are transmitted back to the runtime
* Newly-created components get a generated basic fbp-spec template

## 0.27.5 (2020 September 23)

Bugfixes:

* NoFlo UI now uses namespaces more consistently when communicating with a runtime

## 0.27.4 (2020 September 17)

New features:

* NoFlo components can now also be written in TypeScript (when your runtime supports it)

Bugfixes:

* Component sources are sent correctly to runtime upon creation

## 0.27.3 (2020 September 16)

Bugfixes:

* Node inspectors can now be opened even when there are no events from runtime

## 0.27.2 (2020 September 08)

Bugfixes:

* Pulling repos from GitHub works again

## 0.27.1 (2020 September 04)

New features:

* When creating a graph it is possible to decide whether it will be a subgraph or a main graph
* Component inspector now displays a list of project graphs where the component is in use

Bugfixes:

* Runtime registration works more reliably
* Main graph handling is more consistent

## 0.27.0 (2020 September 03)

New features:

* The runtime live mode is now fully editable just like regular projects
* Modal screens now match the current selected UI theme
* Errors coming from the runtime now include stack traces if available
* Errors are shown in the app UI instead of native notification pop-ups
* Output and errors sent from runtime are now visible in the right-hand bar
* Runtime output can be cleared with the _Clear_ button in the right-hand bar
* Permission errors with runtime communication are now visible
* All messages to and from runtime are now validated against the [FBP Protocol](http://flowbased.github.io/fbp-protocol/) schema, with failures shown in UI
* All errors coming from runtime are also logged into browser's developer console

Bugfixes:

* Fixed node inspector updating of values
* Fixed editing of node and graph names in Safari
* Fixed issue with read-only mode not getting triggered correctly

Internal changes:

* Switched runtime communications to use the new [fbp-client library](https://github.com/flowbased/fbp-client)
* Switched `npm start` from unmaintained simple-server to http-server
* Switched build to more efficient webpack 4.x
* Now loading external JavaScript/CSS dependencies from `browser/vendor` directory instead of `node_modules`
* Converted the noflo-ui codebase from CoffeeScript to ES6 with AirBnB rules

## 0.26.1 (2018 January 11)

Bugfixes:

* Fixed _New component_ dialog setting a wrong language

## 0.26.0 (2018 January 11)

Bugfixes:

* The running status of FBP runtimes accessed in live mode is now shown correctly
* GitHub scopes dialog on main screen shows up again when user hasn't authorized necessary scopes for GitHub synchronization

Internal changes:

* Updated the-graph to 0.11 and React to 15.x

## 0.25.0 (2017 November 27)

New features:

* It is now possible to de-register remote GitHub repositories from noflo-ui

## 0.24.2 (2017 November 24)

New features:

* If project doesn't have graphs set to be main either by name or metadata, the first graph will be selected as default `main` when downloading from GitHub

## 0.24.1 (2017 November 24)

Bugfixes:

* Fixed opening already-downloaded projects via GitHub URL even if they don't have a main graph defined

## 0.24.0 (2017 November 24)

New features:

* It is now possible to delete runtimes and projects directly from the main screen
* Users can enable "debug mode" and edit noflo-ui live in Flowhub

Bugfixes:

* Examples list now updates automatically as runtimes and projects are added or removed

## 0.23.1 (2017 November 17)

Bugfixes:

* Graph minimap hides when viewing component source code
* Fixed broken GitHub pull when received a single file
* Dropped jslint to save 1MB of download, and because it doesn't work correctly with ES6

## 0.23.0 (2017 November 17)

New features:

* noflo-ui now ships with a Dockerfile, allowing you to build and run the IDE with Docker. We also provide automated builds [on Docker Hub](https://hub.docker.com/r/flowhub/noflo-ui/)
* It is now possible to open projects from GitHub in noflo-ui by simply using a URL. Here are some examples:
  - <https://app.flowhub.io/#github/c-base/ingress-table> -- opens the main graph of the repository `master` branch
  - <https://app.flowhub.io/#github/c-base/ingress-table/blob/master/graphs/FetchData.json> -- opens the selected graph from the repository `master` branch
  - <https://app.flowhub.io/#github/c-base/ingress-table/blob/master/components/DetectAttack.coffee> -- opens the selected component from the repository `master` branch
* Tube, the noflo-ui light theme, now works more consistently across the app
* Component and graph creation now includes a visual icon picker
* We now prevent graphs and components inside a project from using overlapping names
* Programming language selection when creating components is now filtered by runtime type
* Pulling a repository from GitHub now opens it after the project has been successfully downloaded
* GitHub operations now check API rate limits before proceeding

Bugfixes:

* Fixed issue with identifying which subgraphs of a project can be sent to runtime
* Fixed issue with component library allowing creation of circular dependencies (graphs using themselves as subgraph)
* Fixed subgraph creation dialog
* Fixed a race condition with initial data loading that might cause some components not to show up in their projects
* Fixed code editor contents sometimes overlapping line numbers
* When synchronizing a repository with GitHub, the operation selector for files now reflects the real selected option
* Graph modifications are now correctly picked up as something that can be pushed to GitHub
* Introduced throttling to GitHub pull operations to prevent browser canceling some of them
* If a graph pulled from GitHub can't be parsed, the error message includes the name of the failing graph

Internal changes:

* Updated noflo-ui to run on NoFlo 1.0
* Updated noflo-ui to run on Polymer 2.x
* Builds are done directly with webpack now, instead of via grunt-noflo-browser
* Switched tests from PhantomJS to Karma and Chrome Headless

## 0.22.1 (2017 October 26)

Bugfixes:

* Fixed GitHub tab not opening

## 0.22.0 (2017 October 24)

New features:

* Updated NoFlo browser demos

Bugfixes:

* Fixed multiple selection of nodes in graph editor
* Fixed auto-scrolling of packets list in edge inspector

Internal changes:

* Upgraded noflo-ui to run on NoFlo 0.8
* Removed all usage of deprecated NoFlo APIs
* Switched actions to use a property instead of bracket IPs

## 0.21.0 (2017 August 23)

Bugfixes:

* Fixed iOS support

Internal changes:

* Updated noflo-ui to [Polymer 1.0](https://www.polymer-project.org/)
* Switched to [the-graph 0.10](https://github.com/flowhub/the-graph/blob/master/CHANGES.md#0100-2017-june-28) which no longer depends on Polymer
* GitHub communications are now done using a Redux-style middleware
* IndexedDB operations are now done using a Redux-style middleware
* noflo-ui build now uses locally-installed grunt
  - to run the test suite, run `npm run test`
  - to make a local build, run `npm run build`

## 0.20.3 (2017 August 10)

New features:

* Added support for the new `opener` FBP protocol transport for opening Flowhub from a running NoFlo web app

## 0.20.2 (2017 June 22)

New features:

* Updated MsgFlo component templates to latest API
* Component templates can now receive project namespace and component name

Bugfixes:

* Fixed saving components coming from runtime when using _Edit as project_
* Ensured runtimes saved via live mode URL get proper labels

## 0.20.1 (2017 June 18)

Bugfixes:

* Safety for parsing repository URLs coming from a runtime

## 0.20.0 (2017 June 16)

New features:

* When synchronizing a project with GitHub, we now default to _Ignore_ instead of push to make it easier to push changes more selectively
* Project repository and branch information is now read from runtime when using _Edit as project_
* Examples are downloaded as local projects when clicked so they'll stay available when offline

Internal changes:

* Polymer elements from [the-graph](https://github.com/flowhub/the-graph) were moved into this repository to aid in Polymer 1.x migration

## 0.19.5 (2017 May 23)

New features:

* Redesigned the top part of the main application screen to take significantly less space
* Added link to [app documentation](https://docs.flowhub.io/)

## 0.19.4 (2017 May 18)

New features

* Added informative banner on GitHub access for non-authenticated and free users

## 0.19.3 (2017 May 16)

Performance improvements

* The main JavaScript file (`noflo-ui.js`) and several of the bigger dependencies are now minified.
This reduces bandwidth required to start the app.
Sourcemaps are provided, so debugging the project should work as before.

## 0.19.2 (2017 May 16)

New features

* The _Edit as project_ button is now shown only when the runtime allows editing
* Runtimes are now persisted on Flowhub registry when opening them via _Edit as project_ for easier access across your multiple devices

## 0.19.1 (2017 May 8)

New features

* Updated `the-graph` to version 0.9 that includes support for read-only live mode

## 0.19.0 (2017 May 6)

New features

* It is now possible to copy a live mode session into a project with the _Edit as project_ button
* Live mode was changed to be read only
* Updated NoFlo component examples to the [0.8 Process API](https://noflojs.org/documentation/components/)
* Project namespace used as library identifier for components and graphs is now separately editable

Bugfixes

* Information packets are now shown full in the packet inspectors instead of getting cut off
* Fixed sending of duplicate `graph:clear` messages to runtimes in project mode
* Fixed the-graph capturing `s` and `f` shortcuts when typing in the search field

Internal changes

* Now using `the-graph` version 0.8. The JavaScript is now bundled via Webpack instead of included in Polymer elements.
This reduces the number of HTTP requests needed.

## 0.18.0 (2017 March 13)

New features

* Single sign-on link for managing user's [Flowhub Plan](https://plans.flowhub.io)

## 0.17.0 (2017 February 20)

Bugfixes

* Fixed fbp-spec tests for components not executing. [#587](https://github.com/noflo/noflo-ui/issues/587)

Internal changes

* Added an `npm start` command, for serving the UI when developing

## 0.16.1 (2017 February 17)

Bugfixes

* Fixed compatibility with latest GitHub OAuth implementation

## 0.16.0 (2017 February 17)

New features

* User information is automatically refreshed from the server at application start-up, allowing instant updates to plan status and other details
* Users can now authorize the app to access either their public or private GitHub repositories from the main screen

Bugfixes

* Examples that require SSL connection are no longer listed when on HTTP
* Fixed login in Chrome app build
* Fixed login in hosted SSL app

## 0.15.0 (2017 February 15)

Bugfixes

* Selecting edges now sends `network:edges` again, so runtime can selectively send edge data. https://github.com/noflo/noflo-ui/issues/328
* Incoming edge data no longer relies on `id` convention for matching edges. https://github.com/noflo/noflo-ui/issues/293
* Updated noflo-runtime module to improve connection reliability with iframe runtimes
* Improved error handling of IndexedDB errors

Internal changes

* Runtime communication is now done using a React-middleware style pipeline.
This should reduce risk of stale state compared to old approach. Some basic tests have been added.
* Fetching of user information from API is now done using React-middleware style pipeline.
Some tests were added.

## 0.14.1 (2017 January 16)

Bugfixes

* Safari 10 compatibility
* Added logic to wait for full runtime connection before sending components and graphs

## 0.14.0 (2016 December 14)

Breaking changes

* Switched from The Grid to direct GitHub authentication. This means changes are required for running NoFlo UI in custom URLs. See the README for more information

## 0.13.0 (2016 September 21)

New features

* Allow editing YAML component code (primarily for MsgFlo)
* Added Python/JS/CoffeeScript/YAML component templates for MsgFlo

Internal changes

* Runtime information is now declared in YAML files under `./runtimeinfo`
instead of being hardcoded various places in the app

Bugfixes

* Fixed build on Windows (issue #595)

## 0.12.2 (2016 July 19)

Bugfixes

* Fixed display of data packet payloads

## 0.12.1 (2016 July 19)

Bugfixes

* Updated the-graph to support pinch-zoom on touchscreen devices

## 0.12.0 (2016 July 19)

New features

* Update from `fbp` 1.3.0 to 1.5.0. Several syntax additions were made,
see the [changelog](https://github.com/flowbased/fbp/blob/master/CHANGES.md#fbp-150---released-06072016)

## 0.11.0 (2016 June 10)

New features

* Automatic running and visualization of [fbp-spec](https://github.com/flowbased/fbp-spec) tests when components or graphs change
* Component libraries are cached by runtime. Allows full editing of graphs when not connected to runtime
* Component search now also seeks descriptions, not just names
* Component changes are now sent to the runtime only after user has stopped typing, instead of on every change
* YAML editing (for fbp-spec) now supports syntax highlighting and linting
* NoFlo component creation template now uses more modern 'WirePattern' component
* [EcmaScript 6](http://es6-features.org/) support for JavaScript runtimes
* Python component language support, including syntax highlighting

Breaking changes

* The iframe runtime communication is now serialized as JSON. Old noflo-browser apps must be rebuilt with `noflo-runtime-iframe 0.6.0+` to be compatible.

Bugfixes

* Fixed Safari 9 compatibility

Internal changes

* Using NoFlo 0.7 instead of NoFlo 0.5
* Using Webpack and NPM dependencies for building instead of component.io. Requires using NPM version 3 or higher
* NoFlo browser build "preview.html" is fetched from http://noflojs.org instead of being bundled. Offline capable after initial load.

## 0.10.0 (2015 June 14)

* Graph tests are now editable in graph inspector
* Moved graph preview HTML (`noflo-browser` only) to its own tab in the inspector
* Fixed resizing of code and spec editors

## 0.9.0 (2015 May 7)

* Support for toggling the `secure` option for edges,
useful for hiding sensitive data like API tokens.
* Add support for [MsgFlo](https://github.com/the-grid/msgflo#readme),
distributed message queue based FBP runtime.
* Can now input secret string for manually added runtimes.
* Added support for `.hpp` (C++), `.c` (C), and `.py` (Python) files in GitHub synchronization.
* Added support for editing and synchronizing [fbp-spec](https://github.com/flowbased/fbp-spec) tests.
TODO: Running the tests
* Fixed GitHub push and pull with non-ASCII characters.

## 0.8.0 (2015 March 24)

* Request re-login if there is no token, fixes login error with Pro plans
* Fix component editing (Stefan Sauer)
* Add "seen ago" label also on runtime selector (Stefan Sauer)
* More readable colors in runtime selector

## 0.7.9 (2015 January 23)

* Match new superagent API in bergie/octo

## 0.7.8 (2015 January 23)

* Specify superagent version (API changes after 0.21.0)

## 0.7.7 (2015 January 23)

* Enabled JSHint and CoffeeLint addons for component editor (#271)
* the-graph 0.3.10
* ~~Polymer 0.5.3~~ (doesn't work in Safari 7-8)

## 0.7.6 (2015 January 15)

* Fix GitHub pull and synchronization

## 0.7.5 (2015 January 15)

* Offer https when loaded on app.flowhub.io

## 0.7.4 (2015 January 15)

* alter some tests

## 0.7.3 (2014 December 20)

* fix klay deps

## 0.7.2 (2014 December 19)

* Update to the-graph 0.3.8

## 0.7.1 (2014 December 11)

* Update to the-graph 0.3.7

## 0.7.0 (2014 December 10)

* Allow adding runtimes manually

## 0.6.0 (2014 December 10)

* Add support for [sndflo runtime](http://github.com/jonnor/sndflo)
* Allow using a custom build for noflo-browser iframe runtimes
* Fix unable to change runtime type for a graph

## 0.5.3 (2014 November 18)

* Compatibility with Android [Add to homescreen](https://developer.chrome.com/multidevice/android/installtohomescreen) feature with Chrome 39+
* Update to [Polymer 0.5.1](https://github.com/Polymer/polymer/releases/tag/0.5.1)
* Fix Safari 7.1+ (#404)

## 0.5.2 (2014 November 13)

* Fixes GitHub permission issue

## 0.5.0 (2014 November 12)

* Support for C, C++ in component code editor
* Added component template for imgflo components
* Full support for custom runtime registry and OAuth provider

## 0.4.0 (2014 November 03)

* [WebRTC](http://en.wikipedia.org/wiki/WebRTC) runtime support,
including live debugging of [NoFlo UI itself](https://twitter.com/jononor/status/525093488246149120)
* Support for launching external NoFlo browser runtime from URL/QR code
* Removed duplicate notification pop-ups
* Fixes to graph preview HTML handling
* Fixes to preview maximization
* New loading and error state visualization
* Enabled opening subgraphs and components also in gist examples
* Allow to configure at buildtime endpoints for runtime registry and OAuth provider

## 0.3.0 (2014 October 14)

* Version naming scheme changed, all noflo-ui versions will be X.Y.0, custom builds should use X.Y.1+
* Copy and paste (via [the-graph](https://github.com/the-grid/the-graph/pull/167))
* Reverted the-graph dependency to use a specific version so noflo-ui tags will work
* Added support for changing the [node icon](http://fontawesome.io/icons/) of subgraphs
* Fixed access to component code in live mode
* MicroFlo import errors are now non-fatal, the specific functionality will just be unavailable
* Support for an offline-mode with reduced functionality, specified at build time
* Fixed creating new graphs with same name would overwrite existing graph

## 0.2.1 (2014 September 16)

* Fixed login not working due to missing error handling on Gravatar failures

## 0.2.0 (2014 September 16)

* Major refactoring to follow the Flux pattern
* Full project synchronization with GitHub
* Ability to connect dynamically to unregistered runtimes via supplying a URL-encoded runtime definition instead of the ID in format `endpoint?protocol=websocket&address=ws://example.net:3569`. For example:

```
#runtime/endpoint%3Fprotocol%3Dwebsocket%26address%3Dws%3A%2F%2Flocalhost%3A3570
```
* Graph search: in the search input, press tab to toggle modes (search library / search graph)
* More [bugfixes and tweaks](https://github.com/noflo/noflo-ui/issues?q=milestone%3A0.2.0+is%3Aclosed)

## 0.1.13 (2014 September 5)

* Firefox `shim-shadowdom` styling fix #320

## 0.1.12 (2014 September 4)

* Updated to Polymer 0.4.0
* JavaFBP support via newer noflo-runtime library

## 0.1.10 (2014 August 4)

* Added the `noflo-react` and `noflo-amd` components and the appropriate Require.js setup to the bundled HTML runtime
* Added `noflo-webaudio`
* Minor authentication fixes

## 0.1.8 (2014 May 25)

* Disable git upload button until you type a commit message
* z-index layering refactor and pixel tweaks
* Bigger curves for loopback edges in the-graph

## 0.1.7 (2014 May 23)

* Autolayout fix

## 0.1.6 (2014 May 20)

* Node inspector renders a `<select>` dropdown for ports with `values` set
* Number scrubber fixes
* Changing label now changes node id #214
* Changes to search UX #238
* Polymer 0.2.4
* Font Awesome 4.1.0

## 0.1.5 (2014 May 17)

* Added support for [viewing component source code](https://github.com/noflo/noflo-ui/issues/223) for library components. Requires runtime-level support
* Support for Chrome 35+ (native custom elements) and Polymer 0.2.3 
* Pinch zoom gesture via Hammer.js 

## 0.1.4 (2014 May 9)

* No changes, just version bump for Chrome app

## 0.1.3 (2014 May 8)

* Added examples to home screen
* Added support for `int` and `date` inport types in Node Inspector
* Fixed IndexedDB initialization issue with Chrome Apps
* `connect` events are also shown now in the edge logs

## 0.1.1 (2014 May 6)

* We now get the GitHub token, Flowhub plan, and user information through a single API call
* Added some anonymized usage metrics to help guide development
* Undo/redo are now disabled when there is no history in that direction

## 0.0.8 (2014 May 1)

* Project creation now requires login

## 0.0.7 (2014 April 29)

* Made CHANGES.md

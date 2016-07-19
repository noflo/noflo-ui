NoFlo UI ChangeLog
==================

# 0.12.2 (2016 July 19)

Bugfixes

* Fixed display of data packet payloads

# 0.12.1 (2016 July 19)

Bugfixes

* Updated the-graph to support pinch-zoom on touchscreen devices

# 0.12.0 (2016 July 19)

New features

* Update from `fbp` 1.3.0 to 1.5.0. Several syntax additions were made,
see the [changelog](https://github.com/flowbased/fbp/blob/master/CHANGES.md#fbp-150---released-06072016)

# 0.11.0 (2016 June 10)

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

# 0.10.0 (2015 June 14)

* Graph tests are now editable in graph inspector
* Moved graph preview HTML (`noflo-browser` only) to its own tab in the inspector
* Fixed resizing of code and spec editors

# 0.9.0 (2015 May 7)

* Support for toggling the `secure` option for edges,
useful for hiding sensitive data like API tokens.
* Add support for [MsgFlo](https://github.com/the-grid/msgflo#readme),
distributed message queue based FBP runtime.
* Can now input secret string for manually added runtimes.
* Added support for `.hpp` (C++), `.c` (C), and `.py` (Python) files in GitHub synchronization.
* Added support for editing and synchronizing [fbp-spec](https://github.com/flowbased/fbp-spec) tests.
TODO: Running the tests
* Fixed GitHub push and pull with non-ASCII characters.

# 0.8.0 (2015 March 24)

* Request re-login if there is no token, fixes login error with Pro plans
* Fix component editing (Stefan Sauer)
* Add "seen ago" label also on runtime selector (Stefan Sauer)
* More readable colors in runtime selector

# 0.7.9 (2015 January 23)

* Match new superagent API in bergie/octo

# 0.7.8 (2015 January 23)

* Specify superagent version (API changes after 0.21.0)

# 0.7.7 (2015 January 23)

* Enabled JSHint and CoffeeLint addons for component editor (#271)
* the-graph 0.3.10
* ~~Polymer 0.5.3~~ (doesn't work in Safari 7-8)

# 0.7.6 (2015 January 15)

* Fix GitHub pull and synchronization

# 0.7.5 (2015 January 15)

* Offer https when loaded on app.flowhub.io

# 0.7.4 (2015 January 15)

* alter some tests

# 0.7.3 (2014 December 20)

* fix klay deps

# 0.7.2 (2014 December 19)

* Update to the-graph 0.3.8

# 0.7.1 (2014 December 11)

* Update to the-graph 0.3.7

# 0.7.0 (2014 December 10)

* Allow adding runtimes manually

# 0.6.0 (2014 December 10)

* Add support for [sndflo runtime](http://github.com/jonnor/sndflo)
* Allow using a custom build for noflo-browser iframe runtimes
* Fix unable to change runtime type for a graph

# 0.5.3 (2014 November 18)

* Compatibility with Android [Add to homescreen](https://developer.chrome.com/multidevice/android/installtohomescreen) feature with Chrome 39+
* Update to [Polymer 0.5.1](https://github.com/Polymer/polymer/releases/tag/0.5.1)
* Fix Safari 7.1+ (#404)

# 0.5.2 (2014 November 13)

* Fixes GitHub permission issue

# 0.5.0 (2014 November 12)

* Support for C, C++ in component code editor
* Added component template for imgflo components
* Full support for custom runtime registry and OAuth provider

# 0.4.0 (2014 November 03)

* [WebRTC](http://en.wikipedia.org/wiki/WebRTC) runtime support,
including live debugging of [NoFlo UI itself](https://twitter.com/jononor/status/525093488246149120)
* Support for launching external NoFlo browser runtime from URL/QR code
* Removed duplicate notification pop-ups
* Fixes to graph preview HTML handling
* Fixes to preview maximization
* New loading and error state visualization
* Enabled opening subgraphs and components also in gist examples
* Allow to configure at buildtime endpoints for runtime registry and OAuth provider

# 0.3.0 (2014 October 14)

* Version naming scheme changed, all noflo-ui versions will be X.Y.0, custom builds should use X.Y.1+
* Copy and paste (via [the-graph](https://github.com/the-grid/the-graph/pull/167))
* Reverted the-graph dependency to use a specific version so noflo-ui tags will work
* Added support for changing the [node icon](http://fontawesome.io/icons/) of subgraphs
* Fixed access to component code in live mode
* MicroFlo import errors are now non-fatal, the specific functionality will just be unavailable
* Support for an offline-mode with reduced functionality, specified at build time
* Fixed creating new graphs with same name would overwrite existing graph

# 0.2.1 (2014 September 16)

* Fixed login not working due to missing error handling on Gravatar failures

# 0.2.0 (2014 September 16)

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

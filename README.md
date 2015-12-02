# NoFlo Development Environment [![Build Status](https://secure.travis-ci.org/noflo/noflo-ui.png?branch=master)](http://travis-ci.org/noflo/noflo-ui)

The NoFlo Development Environment is an offline-capable, client-side web application
that helps users to build and run flow-based programs built with FBP compatible systems such as [NoFlo](http://noflojs.org/),
[imgflo](https://imgflo.org) and [MicroFlo](https://microflo.org).
The NoFlo Development Environment is available under the [MIT license](https://github.com/noflo/noflo-ui/blob/master/LICENSE-MIT).

This project was made possible by [1205 Kickstarter backers](http://noflojs.org/kickstarter/).
Check the [project ChangeLog](https://github.com/noflo/noflo-ui/blob/master/CHANGES.md) for new features and other changes.

## Hosted version

[Flowhub](http://flowhub.io) is a hosted and commercially supported version of the NoFlo Development Environment.
It is free to use for open source projects, and for private projects if you do not need Github integration.

If you just want to create applications, we recommend that you use this version instead of building your own from source.

<a href="http://app.flowhub.io"><img alt="Start Flowhub webapp" src="https://flowhub.io/assets/app-web.svg" width="400"></a>
<a href="https://chrome.google.com/webstore/detail/flowhub/aacpjichompfhafnciggfpfdpfododlk"><img alt="Install Chrome app" src="https://flowhub.io/assets/app-chrome.svg" width="400"></a>

Please read more from <http://flowhub.io/documentation/>. See also the [available support channels](http://noflojs.org/support/).

## FBP systems support

Even though the UI itself is built with NoFlo, it isn't talking directly with NoFlo for running and building graphs.
Instead, it is utilizing the [FBP Network Protocol](http://noflojs.org/documentation/protocol/) which enables it to talk to any compatible FBP system.

By implementing the protocol in your runtime, you can program it with NoFlo UI. If you use WebSockets or WebRTC as the transport, you do not need to change anything on NoFlo UI. One can optionally add syntax highlighting and a 'get started' link to the list of supported runtimes.
If you need/want to use another transport, you can add [support for that](https://github.com/noflo/noflo-runtime).

## Development of NoFlo UI

Only necessary if you want to hack on NoFlo UI itself. Not neccesary for making apps with FBP.
To be able to work on the NoFlo UI you need a checkout of this repository and a working [Node.js](http://nodejs.org/) installation. Go to the checkout folder and run:

    $ npm install

You also need the [Grunt](http://gruntjs.com/) build tool:

    $ sudo npm install -g grunt-cli

This will provide you with all the needed development dependencies. Now you can build a new version by running:

    $ grunt build

You have to run this command as an administrator on Windows.

If you prefer, you can also start a watcher process that will do a rebuild whenever one of the files changes:

    $ grunt watch

Serve the UI using a webserver, then open the URL it in a web browser. Example:

    $ npm install simple-server
    $ ./node_modules/.bin/simple-server . 3005

Where 3005 is the port you want the server to run. Once it is built and the server is running you can access the UI at `http://localhost:3005/index.html`

In addition to this project, the other repository of interest is the [the-graph](https://github.com/the-grid/the-graph) graph editor widget used for editing flows.



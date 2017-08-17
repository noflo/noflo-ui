module.exports = ->
  # Project configuration
  @initConfig
    pkg: @file.readJSON 'package.json'

    # Browser build of NoFlo
    noflo_browser:
      options:
        graph: 'ui/main'
        manifest:
          runtimes: [
            'noflo'
          ]
          discover: true
          recursive: true
          subdirs: false
        baseDir: './'
        webpack:
          externals:
            'repl': 'commonjs repl' # somewhere inside coffee-script
            'module': 'commonjs module' # somewhere inside coffee-script
            'child_process': 'commonjs child_process' # somewhere inside coffee-script
            'jison': 'commonjs jison'
            'should': 'commonjs should' # used by tests in octo
            'express': 'commonjs express' # used by tests in octo
            'highlight': 'commonjs highlight' # used by octo?
            'microflo-emscripten': 'commonjs microflo-emscripten' # optional?
            'acorn': 'commonjs acorn' # optional?
          module:
            rules: [
              test: /\.coffee$/
              use: ["coffee-loader"]
            ,
              test: /\.fbp$/
              use: ["fbp-loader"]
            ,
              test: /\.yaml$/
              use: [
                "json-loader"
                "yaml-include-loader"
              ]
            ]
          resolve:
            extensions: [".coffee", ".js", ".json"]
          node:
            fs: "empty"
        ignores: [
          /bin\/coffee/
        ]
      main:
        files:
          'browser/noflo-ui.js': ['./app/main.js']

    # Vulcanization compiles the Polymer elements into a HTML file
    exec:
      vulcanize:
        command: 'node_modules/.bin/polymer-bundler --strip-comments index.dist.html > index.html'

    # CoffeeScript compilation of tests
    coffee:
      spec:
        options:
          bare: true
        expand: true
        cwd: 'spec'
        src: '*.coffee'
        dest: 'spec'
        ext: '.js'
      spec_utils:
        options:
          bare: true
        expand: true
        cwd: 'spec/utils'
        src: '*.coffee'
        dest: 'spec/utils'
        ext: '.js'
      spec_browser:
        options:
          bare: true
        expand: true
        cwd: 'spec/browser'
        src: '*.coffee'
        dest: 'spec/browser'
        ext: '.js'

    # Directory cleaning
    clean:
      build: [
        'browser'
      ]
      dist: [
        'dist'
      ]
      files: [
        './index.js'
        './index.html'
        './dev.html'
      ]
      themes: [
        'themes'
      ]
      specs: [
        'spec/*.js'
      ]

    # JavaScript minification for the browser
    uglify:
      options:
        report: 'min'
        sourceMap: true
      noflo:
        files:
          './browser/noflo-ui.min.js': ['./browser/noflo-ui.js']

    'string-replace':
      app:
        files:
          './dev.html': './index.dist.html'
          './index.html': './index.html'
          './browser/noflo-ui.min.js': './browser/noflo-ui.min.js'
          './index.js': './index.js'
          './config.xml': './config.dist.xml'
          './manifest.json': './manifest.dist.json'
          './manifest.webapp.json': './manifest.dist.webapp.json'
        options:
          replacements: [
            pattern: /\$NOFLO_OAUTH_PROVIDER/ig
            replacement: process.env.NOFLO_OAUTH_PROVIDER or 'https://github.com'
          ,
            pattern: /\$NOFLO_OAUTH_GATE/ig
            replacement: process.env.NOFLO_OAUTH_GATE or 'https://noflo-gate.herokuapp.com'
          ,
            pattern: /\$NOFLO_OAUTH_SERVICE_USER/ig
            replacement: process.env.NOFLO_OAUTH_SERVICE_USER or 'https://api.flowhub.io'
          ,
            pattern: /\$NOFLO_OAUTH_CLIENT_ID/ig
            replacement: process.env.NOFLO_OAUTH_CLIENT_ID or '46fe25abef8d07e6dc2d'
          ,
            pattern: /\$NOFLO_OAUTH_CLIENT_REDIRECT/ig
            replacement: process.env.NOFLO_OAUTH_CLIENT_REDIRECT or 'http://localhost:9999'
          ,
            pattern: /\$NOFLO_OAUTH_CLIENT_SECRET/ig
            replacement: process.env.NOFLO_OAUTH_CLIENT_SECRET or ''
          ,
            pattern: /\$NOFLO_OAUTH_SSL_CLIENT_ID/ig
            replacement: process.env.NOFLO_OAUTH_SSL_CLIENT_ID or ''
          ,
            pattern: /\$NOFLO_OAUTH_SSL_CLIENT_REDIRECT/ig
            replacement: process.env.NOFLO_OAUTH_SSL_CLIENT_REDIRECT or ''
          ,
            pattern: /\$NOFLO_OAUTH_SSL_CLIENT_SECRET/ig
            replacement: process.env.NOFLO_OAUTH_SSL_CLIENT_SECRET or ''
          ,
            pattern: /\$NOFLO_OAUTH_SSL_ENDPOINT_AUTHENTICATE/ig
            replacement: process.env.NOFLO_SSL_OAUTH_ENDPOINT_AUTHENTICATE or '/authenticate/ssl'
          ,
            pattern: /\$NOFLO_OAUTH_CHROME_CLIENT_ID/ig
            replacement: process.env.NOFLO_OAUTH_CHROME_CLIENT_ID or 'f29ae9f73bfb223d69d7'
          ,
            pattern: /\$NOFLO_OAUTH_CHROME_CLIENT_REDIRECT/ig
            replacement: process.env.NOFLO_OAUTH_CHROME_CLIENT_REDIRECT or 'https://hfhpoogbmnkfihpcaoigganphdglajmp.chromiumapp.org/'
          ,
            pattern: /\$NOFLO_OAUTH_CHROME_CLIENT_SECRET/ig
            replacement: process.env.NOFLO_OAUTH_CHROME_CLIENT_SECRET or ''
          ,
            pattern: /\$NOFLO_OAUTH_CHROME_ENDPOINT_AUTHENTICATE/ig
            replacement: process.env.NOFLO_CHROME_OAUTH_ENDPOINT_AUTHENTICATE or '/authenticate/chrome'
          ,
            pattern: /\$NOFLO_OAUTH_ENDPOINT_AUTHORIZE/ig
            replacement: process.env.NOFLO_OAUTH_ENDPOINT_AUTHORIZE or '/login/oauth/authorize'
          ,
            pattern: /\$NOFLO_OAUTH_ENDPOINT_TOKEN/ig
            replacement: process.env.NOFLO_OAUTH_ENDPOINT_TOKEN or '/login/oauth/access_token'
          ,
            pattern: /\$NOFLO_OAUTH_ENDPOINT_AUTHENTICATE/ig
            replacement: process.env.NOFLO_OAUTH_ENDPOINT_AUTHENTICATE or '/authenticate'
          ,
            pattern: /\$NOFLO_OAUTH_ENDPOINT_USER/ig
            replacement: process.env.NOFLO_OAUTH_ENDPOINT_USER or '/user'
          ,
            pattern: /\$NOFLO_REGISTRY_SERVICE/ig
            replacement: process.env.NOFLO_REGISTRY_SERVICE or 'https://api.flowhub.io'
          ,
            pattern: /\$NOFLO_APP_NAME/ig
            replacement: process.env.NOFLO_APP_NAME or process.env.NOFLO_APP_TITLE or 'NoFlo UI'
          ,
            pattern: /\$NOFLO_APP_TITLE/ig
            replacement: process.env.NOFLO_APP_TITLE or 'NoFlo Development Environment'
          ,
            pattern: /\$NOFLO_APP_LOADING/ig
            replacement: process.env.NOFLO_APP_LOADING or 'Preparing NoFlo UI...'
          ,
            pattern: /\$NOFLO_ORGANIZATION/ig
            replacement: process.env.NOFLO_ORGANIZATION or 'NoFlo Community'
          ,
            pattern: /\$NOFLO_WEBSITE/ig
            replacement: process.env.NOFLO_WEBSITE or 'http://noflojs.org'
          ,
            pattern: /\$NOFLO_APP_DESCRIPTION/ig
            replacement: process.env.NOFLO_APP_DESCRIPTION or 'Flow-Based Programming Environment'
          ,
            pattern: /\$NOFLO_APP_VERSION/ig
            replacement: process.env.NOFLO_APP_VERSION or '<%= pkg.version %>'
          ,
            pattern: /\$NOFLO_THEME/ig
            replacement: process.env.NOFLO_THEME or 'noflo'
          ,
            pattern: /\$NOFLO_USER_LOGIN_ENABLED/ig
            replacement: process.env.NOFLO_USER_LOGIN_ENABLED or true
          ,
            pattern: /\$NOFLO_OFFLINE_MODE/ig
            replacement: process.env.NOFLO_OFFLINE_MODE or false
          ]
      analytics:
        files:
          './dist/index.html': './dist/index.html'
        options:
          replacements: [
            pattern: '<!-- $NOFLO_APP_ANALYTICS -->'
            replacement: process.env.NOFLO_APP_ANALYTICS or "<script>
              (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
                (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
                m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
              })(window,document,'script','//www.google-analytics.com/analytics.js','ga');
              ga('create', 'UA-75936-14', 'noflojs.org');
              ga('send', 'pageview');
            </script>"
          ]

    copy:
      themes:
        expand: true
        flatten: true
        src: ['./node_modules/the-graph/themes/*.css']
        dest: './themes/'

    compress:
      app:
        options:
          archive: 'noflo-<%= pkg.version %>.zip'
        files: [
          src: [
            'browser/noflo-ui.js'
            'browser/noflo-ui.min.js'
            'browser/noflo-ui.min.js.map'
         ]
          expand: true
          dest: '/'
        ,
          src: [
            'node_modules/@polymer/polymer/*.js'
            'node_modules/@polymer/polymer/*.map'
            'node_modules/codemirror/**/*.js'
            'node_modules/codemirror/addon/lint/lint.css'
            'node_modules/codemirror/lib/*.css'
            'node_modules/codemirror/theme/mdn-like.css'
            'node_modules/coffee-script/extras/*.js'
            'node_modules/coffeelint/lib/coffeelint.js'
            'node_modules/jshint/dist/jshint.js'
            'node_modules/font-awesome/css/*.css'
            'node_modules/font-awesome/**/*.woff'
            'node_modules/font-awesome/**/*.ttf'
            'node_modules/font-awesome/**/*.svg'
            'node_modules/hammerjs/hammer.min.js'
            'node_modules/hammerjs/hammer.min.js.map'
            'node_modules/klayjs/klay.js'
            'node_modules/klayjs-noflo/klay-noflo.js'
            'node_modules/react/dist/*.js'
            'node_modules/react-dom/dist/*.js'
            'node_modules/rtc/dist/rtc.min.js'
            'node_modules/rtc/dist/rtc.min.js.map'
            'node_modules/observe-js/src/observe.js'
            'node_modules/the-graph/themes/*.css'
            'node_modules/webcomponents.js/webcomponents-lite.min.js'
          ]
          expand: true
          dest: '/'
        ,
          src: [
            'index.js'
            'index.html'
          ]
          expand: true
          dest: '/'
        ,
          src: ['app/*']
          expand: true
          dest: '/'
        ,
          src: [
            'manifest.json'
            'manifest.webapp.json'
          ]
          expand: true
          dest: '/'
        ,
          src: ['config.xml']
          expand: true
          dest: '/'
        ,
          src: ["#{process.env.NOFLO_THEME or 'noflo'}.ico"]
          expand: true
          dest: '/'
        ,
          src: [
            'css/*'
            'themes/*'
          ]
          expand: true
          dest: '/'
        ]

    unzip:
      dist: 'noflo-<%= pkg.version %>.zip'

    'gh-pages':
      options:
        base: 'dist'
        clone: 'gh-pages'
        message: 'Updating web version to <%= pkg.version %>'
      src: '**/*'


    # Coding standards
    coffeelint:
      app:
        options:
          max_line_length:
            level: "ignore"
        src: [
          'Gruntfile.coffee'
          'src/*.coffee'
          'src/**/*.coffee'
          'components/*.coffee'
        ]
      spec:
        options:
          max_line_length:
            level: "ignore"
        src: 'spec/*.coffee'
      spec_sub:
        options:
          max_line_length:
            level: "ignore"
        src: 'spec/**/*.coffee'


    inlinelint:
      options:
        strict: false,
        newcap: false,
        "globals": { "Polymer": true }
      all:
        src: ['elements/*.html']

    watch:
      spec:
        files: 'spec/*.coffee'
        tasks: ['coffeelint:spec', 'coffee:spec']
        options:
          livereload: false
      spec_browser:
        files: 'spec/browser/*.coffee'
        tasks: ['coffeelint:spec_browser', 'coffee:spec_browser']
        options:
          livereload: false

    # Web server for the browser tests
    connect:
      server:
        options:
          port: 9999
          hostname: '*' # Allow connection from mobile
          livereload: false

    # Generate runner.html
    noflo_browser_mocha:
      all:
        options:
          scripts: [
            "../node_modules/react/dist/react-with-addons.js"
            "../node_modules/react-dom/dist/react-dom.js"
            "../node_modules/hammerjs/hammer.min.js"
            "../browser/<%=pkg.name%>.min.js"
            "./utils/middleware.js"
            "../node_modules/sinon/pkg/sinon.js"
          ]
        files:
          'spec/tests.html': ['spec/*.js']
    # BDD tests on browser
    mocha_phantomjs:
      unit:
        options:
          reporter: 'spec'
          urls: ['http://localhost:9999/spec/tests.html']
          failWithOutput: true
      browser:
        options:
          reporter: 'spec'
          urls: ['http://localhost:9999/spec/browser/tests.html']

    # BDD tests on browser
    'saucelabs-mocha':
      all:
        options:
          urls: ['http://127.0.0.1:9999/spec/browser/tests.html']
          browsers: [
            browserName: 'googlechrome'
            version: '55'
          ,
            browserName: 'safari'
            version: '10'
          ,
            browserName: 'internet explorer'
            version: '11'
          ]
          build: process.env.TRAVIS_JOB_ID
          testname: 'NoFlo UI browser tests'
          tunnelTimeout: 5
          concurrency: 1
          detailedError: true

  # Grunt plugins used for building
  @loadNpmTasks 'grunt-noflo-browser'
  @loadNpmTasks 'grunt-exec'
  @loadNpmTasks 'grunt-contrib-uglify'
  @loadNpmTasks 'grunt-contrib-clean'
  @loadNpmTasks 'grunt-string-replace'
  @loadNpmTasks 'grunt-contrib-copy'

  # Grunt plugins used for mobile app building
  @loadNpmTasks 'grunt-contrib-compress'
  @loadNpmTasks 'grunt-zip'
  @loadNpmTasks 'grunt-gh-pages'

  # Grunt plugins used for testing
  @loadNpmTasks 'grunt-contrib-watch'
  @loadNpmTasks 'grunt-contrib-coffee'
  @loadNpmTasks 'grunt-mocha-phantomjs'
  @loadNpmTasks 'grunt-saucelabs'
  @loadNpmTasks 'grunt-coffeelint'
  @loadNpmTasks 'grunt-contrib-connect'
  @loadNpmTasks 'grunt-lint-inline'

  # For automatic building when working on browser libraries
  @loadNpmTasks 'grunt-contrib-watch'
  @loadNpmTasks 'grunt-contrib-connect'


  # Our local tasks
  @registerTask 'nuke', [
    'clean'
  ]
  @registerTask 'build', [
    'noflo_browser'
    'copy:themes'
    'uglify'
    'exec:vulcanize'
    'string-replace:app'
    'compress'
  ]
  @registerTask 'rebuild', [
    'nuke'
    'build'
  ]
  @registerTask 'test', [
    'coffeelint'
    'inlinelint'
    'build'
    'coffee'
    'noflo_browser_mocha'
    'connect'
    'mocha_phantomjs'
  ]
  @registerTask 'crossbrowser', [
    'test'
    'saucelabs-mocha'
  ]
  @registerTask 'default', [
    'test'
  ]
  @registerTask 'pages', [
    'build'
    'clean:dist'
    'unzip'
    'string-replace:analytics'
    'gh-pages'
  ]
  @registerTask 'spec', [
    'coffeelint:spec'
    'coffeelint:spec_sub'
    'coffee:spec'
    'coffee:spec_utils'
    'coffee:spec_browser'
    'connect:server'
    'watch'
  ]

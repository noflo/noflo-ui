path = require 'path'

module.exports = (grunt) ->
  configFile = grunt.option 'config'
  config = if configFile
    require path.resolve configFile
  else
    {}

  defaultConfig =
    NOFLO_OAUTH_PROVIDER: 'https://passport.thegrid.io'
    NOFLO_OAUTH_GATE: 'https://noflo-gate.herokuapp.com'
    NOFLO_OAUTH_SERVICE_USER: 'https://api.flowhub.io'
    NOFLO_OAUTH_CLIENT_ID: '9d963a3d-8b6f-42fe-bb36-6fccecd039af'
    NOFLO_OAUTH_CLIENT_SECRET: ''
    NOFLO_OAUTH_ENDPOINT_AUTHORIZE: '/login/authorize'
    NOFLO_OAUTH_ENDPOINT_TOKEN: '/token'
    NOFLO_OAUTH_ENDPOINT_AUTHENTICATE: '/authenticate'
    NOFLO_OAUTH_ENDPOINT_USER: '/user'
    NOFLO_REGISTRY_SERVICE: 'https://api.flowhub.io'
    NOFLO_APP_NAME: 'NoFlo UI'
    NOFLO_APP_TITLE: 'NoFlo Development Environment'
    NOFLO_APP_LOADING: 'Preparing NoFlo UI...'
    NOFLO_ORGANIZATION: 'NoFlo Community'
    NOFLO_WEBSITE: 'http://noflojs.org'
    NOFLO_APP_DESCRIPTION: 'Flow-Based Programming Environment'
    NOFLO_APP_VERSION: '<%= pkg.version %>'
    NOFLO_THEME: 'noflo'
    NOFLO_USER_LOGIN_ENABLED: true
    NOFLO_OFFLINE_MODE: false

  getConfig = (option) ->
    process.env[option] or config[option] or defaultConfig[option]

  # Project configuration
  @initConfig
    pkg: @file.readJSON 'package.json'

    'bower-install-simple':
      deps:
        options:
          interactive: false
          forceLatest: false
          directory: 'bower_components'

    # Browser build of NoFlo
    noflo_browser:
      options:
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
            loaders: [
              { test: /\.coffee$/, loader: "coffee-loader" }
              { test: /\.json$/, loader: "json-loader" }
              { test: /\.fbp$/, loader: "fbp-loader" }
            ]
          resolve:
            extensions: ["", ".coffee", ".js"]
          node:
            fs: "mock"
        ignores: [
          /bin\/coffee/
        ]
      main:
        files:
          'browser/noflo-ui.js': ['./app/main.js']

    # Vulcanization compiles the Polymer elements into a HTML file
    vulcanize:
      app:
        options:
          csp: true
        files:
          'index.html': 'index.dist.html'

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

    # Directory cleaning
    clean:
      build: [
        'browser'
      ]
      dependencies: [
        'bower_components'
        'components/*/'
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

    # JavaScript minification for the browser
    uglify:
      options:
        report: 'min'
      noflo:
        files:
          './browser/noflo-ui.min.js': ['./browser/noflo-ui.js']

    'string-replace':
      app:
        files:
          './dev.html': './index.dist.html'
          './index.html': './index.html'
          './browser/noflo-ui.js': './browser/noflo-ui.js'
          './index.js': './index.js'
          './config.xml': './config.dist.xml'
          './manifest.json': './manifest.dist.json'
          './manifest.webapp.json': './manifest.dist.webapp.json'
        options:
          replacements: (for option of defaultConfig
            pattern: new RegExp "\\$#{option}", "ig"
            replacement: getConfig option
          )
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
        src: ['./bower_components/the-graph/themes/*.css']
        dest: './themes/'

    compress:
      app:
        options:
          archive: 'noflo-<%= pkg.version %>.zip'
        files: [
          src: ['browser/noflo-ui.js']
          expand: true
          dest: '/'
        ,
          src: [
            'node_modules/codemirror/**/*.js'
            'node_modules/codemirror/addon/lint/lint.css'
            'node_modules/codemirror/lib/*.css'
            'node_modules/codemirror/theme/mdn-like.css'
            'node_modules/coffee-script/extras/*.js'
            'node_modules/coffeelint/lib/coffeelint.js'
            'node_modules/jshint/dist/jshint.js'
            'bower_components/ease-djdeath/*.js'
            'node_modules/font-awesome/css/*.css'
            'node_modules/font-awesome/**/*.woff'
            'node_modules/font-awesome/**/*.ttf'
            'node_modules/font-awesome/**/*.svg'
            'bower_components/font-awesome/css/*.css'
            'bower_components/font-awesome/**/*.woff'
            'bower_components/font-awesome/**/*.ttf'
            'bower_components/font-awesome/**/*.svg'
            'bower_components/hammerjs/hammer.js'
            'bower_components/klayjs/klay.js'
            'bower_components/klayjs-noflo/klay-noflo.js'
            'bower_components/polymer/*.js'
            'bower_components/react/*.js'
            'bower_components/react.animate-djdeath/*.js'
            'node_modules/rtc/dist/rtc.js'
            'node_modules/rtc/dist/rtc.js.map'
            'bower_components/the-graph/**/*.js'
            'bower_components/the-graph/**/*.css'
            'node_modules/webcomponents.js/webcomponents.min.js'
            'node_modules/indexeddbshim/dist/indexeddbshim.min.js'
          ]
          expand: true
          dest: '/'
        ,
          src: [
            'bower_components/polymer/*.map'
          ]
          expand: true
          flatten: true
          dest: '/'
        ,
          src: ['index.js']
          expand: true
          dest: '/'
        ,
          src: ['index.html']
          expand: true
          dest: '/'
        ,
          src: ['app/*']
          expand: true
          dest: '/'
        ,
          src: ['manifest.json']
          expand: true
          dest: '/'
        ,
          src: ['manifest.webapp.json']
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
          src: ['css/*']
          expand: true
          dest: '/'
        ,
          src: ['themes/*']
          expand: true
          dest: '/'
        ]

    "phonegap-build":
      app:
        options:
          archive: 'noflo-<%= pkg.version %>.zip'
          appId: process.env.PHONEGAP_APP_ID
          user:
            token: process.env.PHONEGAP_TOKEN

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

    # Web server for the browser tests
    connect:
      server:
        options:
          port: 9999
          hostname: '*' # Allow connection from mobile
          livereload: false

    # BDD tests on browser
    'saucelabs-mocha':
      all:
        options:
          urls: ['http://127.0.0.1:9999/spec/runner.html']
          browsers: [
            browserName: 'googlechrome'
            platform: 'OS X 10.8'
            version: '39'
          ,
            browserName: 'safari'
            platform: 'OS X 10.11'
            version: '9'
          ,
            browserName: 'internet explorer'
            platform: 'Windows 8.1',
            version: '11'
          ,
            browserName: 'firefox'
            platform: 'Windows 7',
            version: '34'
          ]
          build: process.env.TRAVIS_JOB_ID
          testname: 'NoFlo UI browser tests'
          tunnelTimeout: 5
          concurrency: 1
          detailedError: true

  # Grunt plugins used for building
  @loadNpmTasks 'grunt-bower-install-simple'
  @loadNpmTasks 'grunt-noflo-browser'
  @loadNpmTasks 'grunt-vulcanize'
  @loadNpmTasks 'grunt-contrib-uglify'
  @loadNpmTasks 'grunt-contrib-clean'
  @loadNpmTasks 'grunt-string-replace'
  @loadNpmTasks 'grunt-contrib-copy'

  # Grunt plugins used for mobile app building
  @loadNpmTasks 'grunt-contrib-compress'
  @loadNpmTasks 'grunt-zip'
  @loadNpmTasks 'grunt-gh-pages'
  @loadNpmTasks 'grunt-phonegap-build'

  # Grunt plugins used for testing
  #@loadNpmTasks 'grunt-mocha-phantomjs'
  @loadNpmTasks 'grunt-contrib-watch'
  @loadNpmTasks 'grunt-contrib-coffee'
  @loadNpmTasks 'grunt-saucelabs'
  @loadNpmTasks 'grunt-coffeelint'
  @loadNpmTasks 'grunt-contrib-connect'
  @loadNpmTasks 'grunt-lint-inline'

  # For automatic building when working on browser libraries
  @loadNpmTasks 'grunt-contrib-watch'
  @loadNpmTasks 'grunt-contrib-connect'


  # Our local tasks
  @registerTask 'nuke', ['clean']
  @registerTask 'build', ['inlinelint', 'bower-install-simple',
                          'noflo_browser',
                          'copy:themes', 'vulcanize', 'string-replace:app', 'compress']
  @registerTask 'rebuild', ['nuke', 'build']
  @registerTask 'test', [
    'coffeelint:app'
    'inlinelint'
    'build'
    'coffee'
    'connect'
    'saucelabs-mocha'
  ]
  @registerTask 'app', ['build', 'phonegap-build']
  @registerTask 'default', ['test']
  @registerTask 'pages', ['build', 'clean:dist', 'unzip', 'string-replace:analytics', 'gh-pages']
  @registerTask 'spec', ['coffeelint:spec', 'coffee:spec', 'connect:server', 'watch']


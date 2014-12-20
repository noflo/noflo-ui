module.exports = ->
  # Project configuration
  @initConfig
    pkg: @file.readJSON 'package.json'

    'bower-install-simple':
      deps:
        options:
          interactive: false
          forceLatest: false
          directory: 'bower_components'

    # Updating the package manifest files
    noflo_manifest:
      update:
        files:
          'component.json': ['graphs/*', 'components/*']

    # Browser build of NoFlo
    noflo_browser:
      main:
        files:
          'browser/noflo-ui.js': ['component.json']
      preview:
        files:
          'preview/browser/noflo-ui-preview.js': ['preview/component.json']

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
        'preview/browser'
      ]
      dependencies: [
        'bower_components'
        'components/*/'
        'preview/components'
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
      preview:
        files:
          './preview/browser/noflo-ui-preview.min.js': ['./preview/browser/noflo-ui-preview.js']

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
          replacements: [
            pattern: /\$NOFLO_OAUTH_PROVIDER/ig
            replacement: process.env.NOFLO_OAUTH_PROVIDER or 'https://passport.thegrid.io'
          ,
            pattern: /\$NOFLO_OAUTH_GATE/ig
            replacement: process.env.NOFLO_OAUTH_GATE or 'https://noflo-gate.herokuapp.com'
          ,
            pattern: /\$NOFLO_OAUTH_SERVICE_USER/ig
            replacement: process.env.NOFLO_OAUTH_SERVICE_USER or 'https://api.flowhub.io'
          ,
            pattern: /\$NOFLO_OAUTH_CLIENT_ID/ig
            replacement: process.env.NOFLO_OAUTH_CLIENT_ID or '9d963a3d-8b6f-42fe-bb36-6fccecd039af'
          ,
            pattern: /\$NOFLO_OAUTH_CLIENT_SECRET/ig
            replacement: process.env.NOFLO_OAUTH_CLIENT_SECRET or ''
          ,
            pattern: /\$NOFLO_OAUTH_ENDPOINT_AUTHORIZE/ig
            replacement: process.env.NOFLO_OAUTH_ENDPOINT_AUTHORIZE or '/login/authorize'
          ,
            pattern: /\$NOFLO_OAUTH_ENDPOINT_TOKEN/ig
            replacement: process.env.NOFLO_OAUTH_ENDPOINT_TOKEN or '/token'
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
        src: ['./bower_components/the-graph/themes/*.css']
        dest: './themes/'

    compress:
      app:
        options:
          archive: 'noflo-<%= pkg.version %>.zip'
        files: [
          src: ['browser/noflo-noflo-indexeddb/vendor/*']
          expand: true
          dest: '/'
        ,
          src: ['browser/noflo-ui.js']
          expand: true
          dest: '/'
        ,
          src: [
            'bower_components/codemirror/**/*.js'
            'bower_components/codemirror/lib/*.css'
            'bower_components/codemirror/theme/mdn-like.css'
            'bower_components/coffee-script/extras/*.js'
            'bower_components/ease-djdeath/*.js'
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
            'bower_components/requirejs/*.js'
            'bower_components/rtc/dist/rtc.js'
            'bower_components/the-graph/**/*.js'
            'bower_components/the-graph/**/*.css'
            'bower_components/webcomponentsjs/webcomponents.js'
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
        ,
          src: ['preview/browser/noflo-noflo-runtime-iframe/runtime/network.js']
          expand: true
          dest: '/'
        ,
          src: ['preview/browser/noflo-ui-preview.js']
          expand: true
          dest: '/'
        ,
          src: ['preview/iframe.html']
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
      preview:
        files: 'preview/components/*/*/*.coffee'
        tasks: ['noflo_browser:preview']
        options:
          livereload: false
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
            version: '37'
          ,
            browserName: 'safari'
            platform: 'OS X 10.9'
            version: '7'
          ,
            browserName: 'ipad'
            platform: 'OS X 10.9'
            version: '8.1'
          ,
            browserName: 'internet explorer'
            platform: 'Windows 8.1',
            version: '11'
          ,
            browserName: 'firefox'
            platform: 'Windows 7',
            version: '33'
          ]
          build: process.env.TRAVIS_JOB_ID
          testname: 'NoFlo UI browser tests'
          tunnelTimeout: 5
          concurrency: 1
          detailedError: true

  # Grunt plugins used for building
  @loadNpmTasks 'grunt-bower-install-simple'
  @loadNpmTasks 'grunt-noflo-manifest'
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
  @registerTask 'build', ['inlinelint', 'noflo_manifest', 'bower-install-simple',
                          'noflo_browser:main', 'noflo_browser:preview',
                          'copy', 'vulcanize', 'string-replace:app', 'compress']
  @registerTask 'rebuild', ['nuke', 'build']
  @registerTask 'test', ['coffeelint:app', 'inlinelint', 'build', 'coffee', 'connect', 'saucelabs-mocha']
  @registerTask 'app', ['build', 'phonegap-build']
  @registerTask 'default', ['test']
  @registerTask 'pages', ['build', 'clean:dist', 'unzip', 'string-replace:analytics', 'gh-pages']
  @registerTask 'devp', ['noflo_browser:preview', 'connect:server', 'watch:preview']
  @registerTask 'spec', ['coffeelint:spec', 'coffee:spec', 'connect:server', 'watch']


module.exports = ->
  # Project configuration
  @initConfig
    pkg: @file.readJSON 'package.json'

    # Browser build of NoFlo
    webpack:
      build: require './webpack.config.js'

    # Vulcanization compiles the Polymer elements into a HTML file
    exec:
      vulcanize:
        command: 'node_modules/.bin/polymer-bundler index.dist.html > index.html'
        cwd: __dirname

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
            'browser/noflo-ui.min.js'
            'browser/noflo-ui.min.js.map'
         ]
          expand: true
          dest: '/'
        ,
          src: require './externals.conf.js'
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

  # Grunt plugins used for building
  @loadNpmTasks 'grunt-webpack'
  @loadNpmTasks 'grunt-exec'
  @loadNpmTasks 'grunt-contrib-clean'
  @loadNpmTasks 'grunt-string-replace'
  @loadNpmTasks 'grunt-contrib-copy'

  # Grunt plugins used for mobile app building
  @loadNpmTasks 'grunt-contrib-compress'
  @loadNpmTasks 'grunt-zip'
  @loadNpmTasks 'grunt-gh-pages'

  # Our local tasks
  @registerTask 'nuke', [
    'clean'
  ]
  @registerTask 'build', [
    'webpack'
    'copy:themes'
    'exec:vulcanize'
    'string-replace:app'
    'compress'
  ]
  @registerTask 'rebuild', [
    'nuke'
    'build'
  ]
  @registerTask 'default', [
    'build'
  ]
  @registerTask 'pages', [
    'build'
    'clean:dist'
    'unzip'
    'string-replace:analytics'
    'gh-pages'
  ]

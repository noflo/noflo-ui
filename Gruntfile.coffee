module.exports = ->
  # Project configuration
  @initConfig
    pkg: @file.readJSON 'package.json'

    # CoffeeScript compilation
    coffee:
      spec:
        options:
          bare: true
        expand: true
        cwd: 'spec'
        src: ['**.coffee']
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

    # Browser version building
    exec:
      bower_cache_clean:
        command: 'node ./node_modules/bower/bin/bower cache clean'
      bower_install:
        command: 'node ./node_modules/bower/bin/bower install -F'
      main_install:
        command: 'node ./node_modules/component/bin/component install'
      main_build:
        command: 'node ./node_modules/component/bin/component build -u component-json,component-coffee -o browser -n noflo-ui -c'
      preview_install:
        command: 'node ./node_modules/component/bin/component install'
        cwd: 'preview'
      preview_build:
        command: 'node ./node_modules/component/bin/component build -u component-json,component-coffee -o browser -n noflo-ui-preview -c'
        cwd: 'preview'
      vulcanize:
        command: 'node ./node_modules/vulcanize/bin/vulcanize --csp -o app.html index.html'

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
          './app.html': './app.html'
          './app.js': './app.js'
          './config.xml': './config.dist.xml'
          './manifest.json': './manifest.dist.json'
          './manifest.webapp': './manifest.dist.webapp'
        options:
          replacements: [
            pattern: /\$NOFLO_OAUTH_CLIENT_ID/ig
            replacement: process.env.NOFLO_OAUTH_CLIENT_ID or '9d963a3d-8b6f-42fe-bb36-6fccecd039af'
          ,
            pattern: /\$NOFLO_OAUTH_GATE/ig
            replacement: process.env.NOFLO_OAUTH_GATE or 'https://noflo-gate.herokuapp.com/'
          ,
            pattern: /\$NOFLO_APP_NAME/ig
            replacement: process.env.NOFLO_APP_NAME or process.env.NOFLO_APP_TITLE or 'NoFlo UI'
          ,
            pattern: /\$NOFLO_APP_TITLE/ig
            replacement: process.env.NOFLO_APP_TITLE or 'NoFlo Development Environment'
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
            'bower_components/**/*.js'
            'bower_components/**/*.css'
            'bower_components/**/*.woff'
            'bower_components/**/*.ttf'
            'bower_components/**/*.svg'
            'bower_components/**/*.map'
          ]
          expand: true
          dest: '/'
        ,
          src: ['app.js']
          expand: true
          dest: '/'
        ,
          src: ['app.html']
          expand: true
          dest: '/'
          rename: (dest, src) -> 'index.html'
        ,
          src: ['app/*']
          expand: true
          dest: '/'
        ,
          src: ['manifest.json']
          expand: true
          dest: '/'
        ,
          src: ['manifest.webapp']
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
      # noflo:
      options:
        max_line_length:
          level: "ignore"
      files: [
        'Gruntfile.coffee'
        'src/*.coffee'
        'src/**/*.coffee'
        'components/*.coffee'
        'spec/*.coffee'
      ]

    inlinelint:
      options:
        strict: false,
        newcap: false,
        "globals": { "Polymer": true }
      all:
        src: ['elements/*.html']


  # Grunt plugins used for building
  @loadNpmTasks 'grunt-contrib-coffee'
  @loadNpmTasks 'grunt-exec'
  @loadNpmTasks 'grunt-contrib-uglify'
  @loadNpmTasks 'grunt-contrib-clean'
  @loadNpmTasks 'grunt-string-replace'

  # Grunt plugins used for mobile app building
  @loadNpmTasks 'grunt-contrib-compress'
  @loadNpmTasks 'grunt-zip'
  @loadNpmTasks 'grunt-gh-pages'
  @loadNpmTasks 'grunt-phonegap-build'

  # Grunt plugins used for testing
  @loadNpmTasks 'grunt-contrib-watch'
  #@loadNpmTasks 'grunt-mocha-phantomjs'
  @loadNpmTasks 'grunt-coffeelint'
  @loadNpmTasks 'grunt-lint-inline'

  # Our local tasks
  @registerTask 'nuke', ['exec:bower_cache_clean', 'clean']
  @registerTask 'build', ['inlinelint', 'exec:main_install', 'exec:bower_install', 'exec:main_build', 'exec:preview_install', 'exec:preview_build', 'exec:vulcanize', 'string-replace:app', 'compress']
  @registerTask 'main_build', ['exec:main_install', 'exec:bower_install', 'exec:main_build']
  @registerTask 'main_rebuild', ['clean:nuke_main', 'clean:nuke_bower', 'main_build']
  @registerTask 'preview_build', ['exec:preview_install', 'exec:preview_build']
  @registerTask 'preview_rebuild', ['clean:nuke_preview', 'preview_build']
  @registerTask 'rebuild', ['main_rebuild', 'preview_rebuild']
  @registerTask 'test', ['coffeelint', 'inlinelint']
  @registerTask 'app', ['build', 'phonegap-build']
  @registerTask 'default', ['test']
  @registerTask 'pages', ['build', 'clean:dist', 'unzip', 'string-replace:analytics', 'gh-pages']

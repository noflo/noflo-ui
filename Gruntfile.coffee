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
      nuke_main:
        src: ['components/*/']
      nuke_main_built:
        src: ['browser']
      nuke_bower:
        src: ['bower_components']
      nuke_preview:
        src: ['preview/components']
      nuke_preview_built:
        src: ['preview/browser']

    # Browser version building
    exec:
      bower_install:
        command: 'node ./node_modules/bower/bin/bower install'
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

    compress:
      app:
        options:
          archive: 'noflo.zip'
        files: [
          src: ['browser/noflo-noflo-indexeddb/vendor/*']
          expand: true
          dest: '/'
        ,
          src: ['browser/noflo-noflo-polymer/noflo-polymer/*']
          expand: true
          dest: '/'
        ,
          src: ['browser/noflo-ui.js']
          expand: true
          dest: '/'
        ,
          src: ['bower_components/**', '!bower_components/**/index.html']
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
          src: ['config.xml']
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
          archive: 'noflo.zip'
          appId: process.env.PHONEGAP_APP_ID
          user:
            token: process.env.PHONEGAP_TOKEN

    # Automated recompilation and testing when developing
    watch:
      files: [
        'src/*.coffee'
        'src/**/*.coffee'
        'components/*.coffee'
        'graphs/*.json'
        'component.json'
        'spec/*.coffee'
      ]
      tasks: ['test']


    # BDD tests on browser
    mocha_phantomjs:
      options:
        output: 'spec/result.xml'
        reporter: 'dot'
      all: ['spec/runner.html']

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

  # Grunt plugins used for mobile app building
  @loadNpmTasks 'grunt-contrib-compress'
  @loadNpmTasks 'grunt-phonegap-build'

  # Grunt plugins used for testing
  @loadNpmTasks 'grunt-contrib-watch'
  #@loadNpmTasks 'grunt-mocha-phantomjs'
  @loadNpmTasks 'grunt-coffeelint'
  @loadNpmTasks 'grunt-lint-inline'

  # Our local tasks
  @registerTask 'nuke', ['clean:nuke_main', 'clean:nuke_bower', 'clean:nuke_preview', 'clean:nuke_main_built', 'clean:nuke_preview_built']
  @registerTask 'build', ['exec:main_install', 'exec:bower_install', 'exec:main_build', 'exec:preview_install', 'exec:preview_build', 'exec:vulcanize']
  @registerTask 'main_build', ['exec:main_install', 'exec:bower_install', 'exec:main_build']
  @registerTask 'main_rebuild', ['clean:nuke_main', 'clean:nuke_bower', 'main_build']
  @registerTask 'preview_build', ['exec:preview_install', 'exec:preview_build']
  @registerTask 'preview_rebuild', ['clean:nuke_preview', 'preview_build']
  @registerTask 'rebuild', ['main_rebuild', 'preview_rebuild']
  # @registerTask 'test', ['coffeelint', 'build', 'coffee', 'mocha_phantomjs']
  @registerTask 'test', ['coffeelint', 'inlinelint']
  @registerTask 'app', ['build', 'compress', 'phonegap-build']
  @registerTask 'default', ['test']

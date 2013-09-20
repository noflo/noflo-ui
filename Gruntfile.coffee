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

    # Browser version building
    exec:
      main_install:
        command: './node_modules/.bin/component install'
      main_build:
        command: './node_modules/.bin/component build -u component-json,component-coffee -o browser -n noflo-ui -c'
      preview_install:
        command: './node_modules/.bin/component install'
        cwd: 'preview'
      preview_build:
        command: './node_modules/.bin/component build -u component-json,component-coffee -o browser -n noflo-ui-preview -c'
        cwd: 'preview'

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
          src: ['browser/meemoo-dataflow/libs/*']
          expand: true
          dest: '/'
        ,
          src: ['browser/meemoo-dataflow/fonts/*']
          expand: true
          dest: '/'
        ,
          src: ['browser/meemoo-dataflow/build/default/*']
          expand: true
          dest: '/'
        ,
          src: ['browser/noflo-ui.js']
          expand: true
          dest: '/'
        ,
          src: ['index.html']
          expand: true
          dest: '/'
        ,
          src: ['config.xml']
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
        ,
          src: ['examples/*']
          expand: true
          dest: '/'
        ,
          src: ['examples/images/*']
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
      files: ['spec/*.coffee', 'src/*.coffee', 'src/**/*.coffee']
      tasks: ['test']

    # BDD tests on browser
    mocha_phantomjs:
      options:
        output: 'spec/result.xml'
        reporter: 'dot'
      all: ['spec/runner.html']

    # Coding standards
    coffeelint:
      components: ['components/*.coffee']

  # Grunt plugins used for building
  @loadNpmTasks 'grunt-contrib-coffee'
  @loadNpmTasks 'grunt-exec'
  @loadNpmTasks 'grunt-contrib-uglify'

  # Grunt plugins used for mobile app building
  @loadNpmTasks 'grunt-contrib-compress'
  @loadNpmTasks 'grunt-phonegap-build'

  # Grunt plugins used for testing
  @loadNpmTasks 'grunt-contrib-watch'
  @loadNpmTasks 'grunt-mocha-phantomjs'
  @loadNpmTasks 'grunt-coffeelint'

  # Our local tasks
  @registerTask 'build', ['exec', 'uglify']
  @registerTask 'test', ['coffeelint', 'build', 'coffee', 'mocha_phantomjs']
  @registerTask 'app', ['build', 'compress', 'phonegap-build']
  @registerTask 'default', ['test']

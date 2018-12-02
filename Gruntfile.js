const webpackConfig = require('./webpack.config.js');

module.exports = function () {
  // Project configuration
  this.initConfig({
    pkg: this.file.readJSON('package.json'),

    // Browser build of NoFlo
    webpack: {
      build: webpackConfig,
    },

    // Vulcanization compiles the Polymer elements into a HTML file
    exec: {
      vulcanize: {
        command: 'node_modules/.bin/polymer-bundler index.dist.html > index.html',
        cwd: __dirname,
      },
    },

    // Directory cleaning
    clean: {
      build: [
        'browser',
      ],
      dist: [
        'dist',
      ],
      files: [
        './index.js',
        './index.html',
        './dev.html',
      ],
      themes: [
        'themes',
      ],
      specs: [
        'spec/*.js',
      ],
    },

    'string-replace': {
      app: {
        files: {
          './dev.html': './index.dist.html',
          './index.html': './index.html',
          './browser/noflo-ui.min.js': './browser/noflo-ui.min.js',
          './index.js': './index.js',
          './config.xml': './config.dist.xml',
          './manifest.json': './manifest.dist.json',
          './manifest.webapp.json': './manifest.dist.webapp.json',
        },
        options: {
          replacements: [{
            pattern: /\$NOFLO_OAUTH_PROVIDER/ig,
            replacement: process.env.NOFLO_OAUTH_PROVIDER || 'https://github.com',
          },
          {
            pattern: /\$NOFLO_OAUTH_GATE/ig,
            replacement: process.env.NOFLO_OAUTH_GATE || 'https://noflo-gate.herokuapp.com',
          },
          {
            pattern: /\$NOFLO_OAUTH_SERVICE_USER/ig,
            replacement: process.env.NOFLO_OAUTH_SERVICE_USER || 'https://api.flowhub.io',
          },
          {
            pattern: /\$NOFLO_OAUTH_CLIENT_ID/ig,
            replacement: process.env.NOFLO_OAUTH_CLIENT_ID || '46fe25abef8d07e6dc2d',
          },
          {
            pattern: /\$NOFLO_OAUTH_CLIENT_REDIRECT/ig,
            replacement: process.env.NOFLO_OAUTH_CLIENT_REDIRECT || 'http://localhost:9999',
          },
          {
            pattern: /\$NOFLO_OAUTH_CLIENT_SECRET/ig,
            replacement: process.env.NOFLO_OAUTH_CLIENT_SECRET || '',
          },
          {
            pattern: /\$NOFLO_OAUTH_SSL_CLIENT_ID/ig,
            replacement: process.env.NOFLO_OAUTH_SSL_CLIENT_ID || '',
          },
          {
            pattern: /\$NOFLO_OAUTH_SSL_CLIENT_REDIRECT/ig,
            replacement: process.env.NOFLO_OAUTH_SSL_CLIENT_REDIRECT || '',
          },
          {
            pattern: /\$NOFLO_OAUTH_SSL_CLIENT_SECRET/ig,
            replacement: process.env.NOFLO_OAUTH_SSL_CLIENT_SECRET || '',
          },
          {
            pattern: /\$NOFLO_OAUTH_SSL_ENDPOINT_AUTHENTICATE/ig,
            replacement: process.env.NOFLO_SSL_OAUTH_ENDPOINT_AUTHENTICATE || '/authenticate/ssl',
          },
          {
            pattern: /\$NOFLO_OAUTH_CHROME_CLIENT_ID/ig,
            replacement: process.env.NOFLO_OAUTH_CHROME_CLIENT_ID || 'f29ae9f73bfb223d69d7',
          },
          {
            pattern: /\$NOFLO_OAUTH_CHROME_CLIENT_REDIRECT/ig,
            replacement: process.env.NOFLO_OAUTH_CHROME_CLIENT_REDIRECT || 'https://hfhpoogbmnkfihpcaoigganphdglajmp.chromiumapp.org/',
          },
          {
            pattern: /\$NOFLO_OAUTH_CHROME_CLIENT_SECRET/ig,
            replacement: process.env.NOFLO_OAUTH_CHROME_CLIENT_SECRET || '',
          },
          {
            pattern: /\$NOFLO_OAUTH_CHROME_ENDPOINT_AUTHENTICATE/ig,
            replacement: process.env.NOFLO_CHROME_OAUTH_ENDPOINT_AUTHENTICATE || '/authenticate/chrome',
          },
          {
            pattern: /\$NOFLO_OAUTH_ENDPOINT_AUTHORIZE/ig,
            replacement: process.env.NOFLO_OAUTH_ENDPOINT_AUTHORIZE || '/login/oauth/authorize',
          },
          {
            pattern: /\$NOFLO_OAUTH_ENDPOINT_TOKEN/ig,
            replacement: process.env.NOFLO_OAUTH_ENDPOINT_TOKEN || '/login/oauth/access_token',
          },
          {
            pattern: /\$NOFLO_OAUTH_ENDPOINT_AUTHENTICATE/ig,
            replacement: process.env.NOFLO_OAUTH_ENDPOINT_AUTHENTICATE || '/authenticate',
          },
          {
            pattern: /\$NOFLO_OAUTH_ENDPOINT_USER/ig,
            replacement: process.env.NOFLO_OAUTH_ENDPOINT_USER || '/user',
          },
          {
            pattern: /\$NOFLO_REGISTRY_SERVICE/ig,
            replacement: process.env.NOFLO_REGISTRY_SERVICE || 'https://api.flowhub.io',
          },
          {
            pattern: /\$NOFLO_APP_NAME/ig,
            replacement: process.env.NOFLO_APP_NAME || process.env.NOFLO_APP_TITLE || 'NoFlo UI',
          },
          {
            pattern: /\$NOFLO_APP_TITLE/ig,
            replacement: process.env.NOFLO_APP_TITLE || 'NoFlo Development Environment',
          },
          {
            pattern: /\$NOFLO_APP_LOADING/ig,
            replacement: process.env.NOFLO_APP_LOADING || 'Preparing NoFlo UI...',
          },
          {
            pattern: /\$NOFLO_ORGANIZATION/ig,
            replacement: process.env.NOFLO_ORGANIZATION || 'NoFlo Community',
          },
          {
            pattern: /\$NOFLO_WEBSITE/ig,
            replacement: process.env.NOFLO_WEBSITE || 'http://noflojs.org',
          },
          {
            pattern: /\$NOFLO_APP_DESCRIPTION/ig,
            replacement: process.env.NOFLO_APP_DESCRIPTION || 'Flow-Based Programming Environment',
          },
          {
            pattern: /\$NOFLO_APP_VERSION/ig,
            replacement: process.env.NOFLO_APP_VERSION || '<%= pkg.version %>',
          },
          {
            pattern: /\$NOFLO_THEME/ig,
            replacement: process.env.NOFLO_THEME || 'noflo',
          },
          {
            pattern: /\$NOFLO_USER_LOGIN_ENABLED/ig,
            replacement: process.env.NOFLO_USER_LOGIN_ENABLED || true,
          },
          ],
        },
      },
      analytics: {
        files: {
          './dist/index.html': './dist/index.html',
        },
        options: {
          replacements: [{
            pattern: '<!-- $NOFLO_APP_ANALYTICS -->',
            replacement: process.env.NOFLO_APP_ANALYTICS || '<script> \
(function(i,s,o,g,r,a,m){i[\'GoogleAnalyticsObject\']=r;i[r]=i[r]||function(){ \
(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o), \
m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m) \
})(window,document,\'script\',\'//www.google-analytics.com/analytics.js\',\'ga\'); \
ga(\'create\', \'UA-75936-14\', \'noflojs.org\'); \
ga(\'send\', \'pageview\'); \
</script>',
          },
          ],
        },
      },
    },

    compress: {
      app: {
        options: {
          archive: 'noflo-<%= pkg.version %>.zip',
        },
        files: [{
          src: [
            'browser/noflo-ui.min.js',
            'browser/noflo-ui.min.js.map',
          ],
          expand: true,
          dest: '/',
        },
        {
          src: require('./externals.conf.js'),
          expand: true,
          dest: '/',
        },
        {
          src: [
            'index.js',
            'index.html',
          ],
          expand: true,
          dest: '/',
        },
        {
          src: ['app/*'],
          expand: true,
          dest: '/',
        },
        {
          src: [
            'manifest.json',
            'manifest.webapp.json',
          ],
          expand: true,
          dest: '/',
        },
        {
          src: ['config.xml'],
          expand: true,
          dest: '/',
        },
        {
          src: [`${process.env.NOFLO_THEME || 'noflo'}.ico`],
          expand: true,
          dest: '/',
        },
        {
          src: [
            'css/*',
          ],
          expand: true,
          dest: '/',
        },
        ],
      },
    },

    unzip: {
      dist: 'noflo-<%= pkg.version %>.zip',
    },

    'gh-pages': {
      options: {
        base: 'dist',
        clone: 'gh-pages',
        message: 'Updating web version to <%= pkg.version %>',
      },
      src: '**/*',
    },

    sharedstylecomponent: {
      'elements/the-graph-styles.html': [
        'node_modules/the-graph/themes/the-graph-dark.css',
        'node_modules/the-graph/themes/the-graph-light.css',
      ],
      'elements/codemirror-styles.html': [
        'node_modules/codemirror/addon/lint/lint.css',
        'node_modules/codemirror/lib/codemirror.css',
        'node_modules/codemirror/theme/mdn-like.css',
        'css/codemirror-noflo.css',
      ],
    },
  });

  // Grunt plugins used for building
  this.loadNpmTasks('grunt-webpack');
  this.loadNpmTasks('grunt-exec');
  this.loadNpmTasks('grunt-contrib-clean');
  this.loadNpmTasks('grunt-string-replace');

  // Grunt plugins used for mobile app building
  this.loadNpmTasks('grunt-contrib-compress');
  this.loadNpmTasks('grunt-zip');
  this.loadNpmTasks('grunt-gh-pages');

  // Our local tasks
  const grunt = this;
  this.registerMultiTask('sharedstylecomponent', 'Combine CSS files into a Polymer shared style element', function () {
    const path = require('path');
    const sources = this.data.map(file => grunt.file.read(file));
    const template = `\
<!-- Generated from <%= files %> -->
<dom-module id="<%= id %>">
  <template>
    <style>
      <%= sources %>
    </style>
  </template>
</dom-module>\
`;
    const id = path.basename(this.target, path.extname(this.target));
    const result = grunt.template.process(template, {
      data: {
        id,
        files: this.data.join(', '),
        sources: sources.join('\n'),
      },
    });
    grunt.file.write(this.target, result);
    return grunt.log.writeln(`Generated ${this.target} from ${this.data.join(', ')}`);
  });

  this.registerTask('nuke', [
    'clean',
  ]);
  this.registerTask('build_noflo', [
    'webpack',
  ]);
  this.registerTask('build_polymer', [
    'sharedstylecomponent',
    'exec:vulcanize',
  ]);
  this.registerTask('build', [
    'build_noflo',
    'build_polymer',
    'string-replace:app',
    'compress',
  ]);
  this.registerTask('rebuild', [
    'nuke',
    'build',
  ]);
  this.registerTask('default', [
    'build',
  ]);
  return this.registerTask('pages', [
    'build',
    'clean:dist',
    'unzip',
    'string-replace:analytics',
    'gh-pages',
  ]);
};

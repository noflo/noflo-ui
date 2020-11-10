const path = require('path');
const webpackConfig = require('./webpack.config.js');

module.exports = function () {
  // Project configuration
  this.initConfig({
    pkg: this.file.readJSON('package.json'),

    // Browser build of NoFlo
    webpack: {
      build: webpackConfig,
    },

    sharedstylecomponent: {
      'elements/the-graph-styles.js': [
        'node_modules/the-graph/themes/the-graph-dark.css',
        'node_modules/the-graph/themes/the-graph-light.css',
      ],
      'elements/codemirror-styles.js': [
        'node_modules/codemirror/addon/lint/lint.css',
        'node_modules/codemirror/lib/codemirror.css',
        'node_modules/codemirror/theme/mdn-like.css',
        'css/codemirror-noflo.css',
      ],
    },
  });

  // Grunt plugins used for building
  this.loadNpmTasks('grunt-webpack');

  // Our local tasks
  const grunt = this;
  this.registerMultiTask('sharedstylecomponent', 'Combine CSS files into a Polymer shared style element', function () {
    const sources = this.data.map((file) => grunt.file.read(file));
    const template = `\
/**
 * Generated from <%= files %>
 */
const $_documentContainer = document.createElement('template');
$_documentContainer.innerHTML = \`
<dom-module id="<%= id %>">
  <template>
    <style>
      <%= sources %>
    </style>
  </template>
</dom-module>\`;
document.head.appendChild($_documentContainer.content);
`;
    const id = path.basename(this.target, path.extname(this.target));
    const result = grunt.template.process(template, {
      data: {
        id,
        files: this.data.map((f) => path.basename(f)).join(', '),
        sources: sources.join('\n'),
      },
    });
    grunt.file.write(this.target, result);
    return grunt.log.writeln(`Generated ${this.target} from ${this.data.join(', ')}`);
  });

  this.registerTask('build_noflo', [
    'webpack',
  ]);
  this.registerTask('build_polymer', [
    'sharedstylecomponent',
  ]);
  this.registerTask('build', [
    'build_polymer',
    'build_noflo',
  ]);
  this.registerTask('rebuild', [
    'nuke',
    'build',
  ]);
  this.registerTask('default', [
    'build',
  ]);
  this.registerTask('pages', [
    'build',
  ]);
};

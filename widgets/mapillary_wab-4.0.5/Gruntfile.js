/*jshint node:true*/
module.exports = function (grunt) {
	'use strict';

	// show elapsed time at the end
	require('time-grunt')(grunt);
	// load all grunt tasks
	require('load-grunt-tasks')(grunt, [ 'grunt-*']);
	grunt.loadNpmTasks('intern');
	var buildConfig = {
		  src: '.',
		  dist: './dist'
	  };
	grunt.initConfig({
		// Metadata.
		build: buildConfig,
        jshint: {
            gruntfile: {
                src: 'Gruntfile.js'
            },
            src: {
                src: [
                    '<%= build.src %>/**/**.{js,json}',
                    '!<%= build.src %>/**/**.min.js',
                    '!<%= build.src %>/lib/**/**',
                    '!<%= build.src %>/node_modules/**/**',
                    '!<%= build.src %>/tests/**/**',
                    '!<%= build.dist %>/**/**'
                ]
            }
        },

        csslint: {
            options: {
                'import': false,
                'floats': false,
                'adjoining-classes': false,
                'universal-selector': false,
                'unqualified-attributes': false,
                'box-model': false,
                'box-sizing': false,
                'important': false,
                'font-sizes': false,
                'outline-none': false,
                'unique-headings': false,
                'qualified-headings': false,
                'regex-selectors': false
            },
            src: [
                '<%= build.src %>/**/**.css',
                '!<%= build.src %>/lib/**/**',
                '!<%= build.src %>/node_modules/**/**',
                '!<%= build.src %>/tests/**/**',
                '!<%= build.dist %>/**/**',
                '!*min.css'
            ]
        },

        htmlhint: {
            options: {
                'id-unique': true,
                'tag-pair': true,
                'spec-char-escape': true,
                'attr-value-not-empty': true,
                'attr-value-double-quotes': true,
                'attr-lowercase': true,
                'style-disabled': true
            },
            html: {
                src: [
                    '<%= build.src %>/**/**.html'
                ]
            }
        },

        dojo: {
            widget: {
                options: {
                    profile: 'build.profile.js'
                }
            },

			options: {
				releaseDir: '<%= build.dist %>',
				dojo: '<%= build.src %>/build.js',
				load: 'build',
				cwd: '<%= build.src %>',
				basePath: '<%= build.src %>'
			}
		},

		intern: {
			local: {
				options: {
					runType: 'client',
					config: 'tests/intern',
					reporters: [ 'Html' ],
					suites: [ 'tests/unit/all' ]
				}
			},
			cli: {
				options: {
					runType: 'client',
					config: 'tests/intern',
					reporters: [ 'Console' ],
					suites: [ 'tests/unit/all' ]
				}
			},
			remote: {
				options: {
					runType: 'runner',
					config: 'tests/intern',
					reporters: [ 'Console', 'Lcov' ],
					suites: [ 'tests/unit/all' ]
				}
			}
		},

		copy: {
		    toWab: {
                files: [{
                    expand: true,
                    cwd: '<%= build.src %>/',
                    src: [
                        '<%= build.src %>/*.{js,json,html,css}',
                        '<%= build.src %>/{css,images,lib,mapillary-objects,nls,setting}/**/*',
                        '!<%= build.src %>/Gruntfile.js',
                        '!<%= build.src %>/.git',
                        '!<%= build.src %>/node_modules'
                    ],
                    dest: '../../../../server/apps/2/widgets/Mapillary'
                }]
            },
			main: {
				files: [{
					expand: true,
					cwd: '<%= build.src %>/',
					src: ['manifest.json'],
					dest: '<%= build.dist %>/'
				}]
			},
			build: {
				files: [{
					expand: true,
                    cwd: '<%= build.dist %>/widgets/Mapillary/',
					src: [
					    '*',
                        '{css,images,lib,mapillary-objects,nls,setting}/**/*'
                    ],
					dest: '<%= build.dist %>'
				}]
			}
		},

        watch: {
            wab: {
                files: [
                    '<%= build.src %>/*',
                    '<%= build.src %>/{css,images,lib,mapillary-objects,nls,setting}/**/*',
                    '!<%= build.src %>/Gruntfile.js',
                    '!<%= build.src %>/.git',
                    '!<%= build.src %>/node_modules'
                ],
                tasks: ['copy:toWab']
            }
        },

		clean: {
			dist: [
				'<%= build.dist %>/*'
			],
			build: {
				files: [{
					dot: true,
                    cwd: '<%= build.dist %>/',
					src: [
					    '<%= build.dist %>/dojo',
                        '<%= build.dist %>/widgets',
						'**/*.uncompressed.js',
						'**/*.consoleStripped.js',
						'**/*.{js,json}',
                        '!config.json',
                        '!Widget.js',
                        '!Setting.js',
						'!Widget.html'
						// '<%= build.dist %>/dijit',
						// '<%= build.dist %>/dstore',
						// '<%= build.dist %>/dojox',
						// '<%= build.dist %>/put-selector',
						// '<%= build.dist %>/util',
						// '<%= build.dist %>/xstyle'
					]
				}]
			}
		}
	});

	// Default task.
	grunt.registerTask('default', ['build']);

	//Linting tasks
	grunt.registerTask('lint', ['jshint', 'csslint', 'htmlhint']);

	//Test tasks
	grunt.registerTask('test', [ 'intern:cli' ]);

	// Clean tasksa
	grunt.registerTask('cleanbuild', ['clean:build']);

	grunt.registerTask('build', function (target) {
        // always verbose
        grunt.option('verbose', true);
		// always force build
		grunt.option('force', true);
		// Default to widget build
		target = target || 'widget';
		grunt.task.run(['clean:dist', /*'lint',*/ 'dojo:' + target, 'copy:build', 'cleanbuild']);
	});
};

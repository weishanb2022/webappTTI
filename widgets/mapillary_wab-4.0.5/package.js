/**
 * This file is referenced by the `dojoBuild` key in `package.json` and provides extra
 * hinting specific to the Dojo build system about how certain files in the package need
 * to be handled at build time. Build profiles for the
 * application itself are stored in the `profiles` directory.
 */
/*jshint unused:false*/
var profile = {
	// Resource tags are functions that provide hints to the build system about the way
	// files should be processed. Each of these functions is called once for every file in the
	// package directory. The first argument passed to the function is the filename of the file,
	// and the second argument is the computed AMD module ID of the file.
	resourceTags: {
		// Files that contain test code and should be excluded when the `copyTests` build flag
		// exists and is `false`.
		// It is strongly recommended that the `mini` build flag be used instead of `copyTests`.
		//Therefore, no files
		// are marked with the `test` tag here.
		test: function (filename, mid) {
			return (/test/).test(mid);
		},

		ignore: function(filename, mid) {
			return (/node_modules/).test(filename);
		},

		// Files that should be copied as-is without being modified by the build system.
		copyOnly: function (filename, mid) {
			return (/(min|lib)/).test(filename) || (/nls/).test(mid);
		},

		// Files that are AMD modules.
		// All JavaScript in this package should be AMD modules if you are starting a new project.
		//If you are copying
		// any legacy scripts from an existing project, those legacy scripts should not be given the
		//`amd` tag.
		amd: function (filename, mid) {
			//filename:
			//  D:/WORK_ROOT/devtopia/arcgis-webappbuilder/buildOutput/temp/jimu.js/dijit/CheckBox.js
			//mid: jimu/dijit/CheckBox
			return !this.copyOnly(filename, mid) && !/\.profile\.js/.test(filename) && /\.js$/.test(filename);
		},

		// Files that should not be copied when the `mini` build flag is set to true.
		// In this case, we are excluding this package configuration file which is not necessary
		//in a built copy of
		// the application.
		miniExclude: function (filename, mid) {
			return mid in {
				'Mapillary/package': 1,
                'Mapillary/build': 1,
                'Mapillary/build.profile': 1,
				'Mapillary/node_modules': 1,
				'Mapillary/dist': 1,
				'Mapillary/Gruntfile': 1
			};
		}
	}
};
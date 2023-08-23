/*global require */
/**
 * This is the default application build profile used by the boilerplate. While it looks similar, this build profile
 * is different from the package build profile at `app/package.js` in the following ways:
 *
 * 1. you can have multiple application build profiles (e.g. one for desktop, one for tablet, etc.), but only one
 *    package build profile;
 * 2. the package build profile only configures the `resourceTags` for the files in the package, whereas the
 *    application build profile tells the build system how to build the entire application.
 *
 * Look to `util/build/buildControlDefault.js` for more information on available options and their default values.
 */

var profile = {
    optimizeOptions: {
        languageIn: "ECMASCRIPT5"
    },
    // `basePath` is relative to the directory containing this profile file; in this case, it is being set to the
    // src/ directory, which is the same place as the `baseUrl` directory in the loader configuration. (If you change
    // this, you will also need to update run.js.)
    basePath: '../',

    // release directory
    releaseDir: '../.',

    // nls handling
    localeList: 'en,en-us,ar,de,es,fr,it,sv',
    //localeList: 'ar,ca,cs,da,de,el,en,en-gb,en-us,es,es-es,fi,fi-fi,fr,fr-fr,he,he-il,hu,it,it-it,ja,ja-jp,ko,ko-kr,nl,nl-nl,nb,pl,pt,pt-br,pt-pt,ru,sk,sl,sv,th,tr,zh,zh-tw,zh-cn',


    // This is the directory within the release directory where built packages will be placed. The release directory
    // itself is defined by `build.sh`. You should probably not use this; it is a legacy option dating back to Dojo
    // 0.4.
    // If you do use this, you will need to update build.sh, too.
    // releaseName: '',

    // Builds a new release.
    action: 'release',

    // Strips all comments and whitespace from CSS files and inlines @imports where possible.
    cssOptimize: 'comments',

    // Excludes tests, demos, and original template files from being included in the built version.
    mini: true,

    // Build source map files to aid in debugging.
    // This defaults to true.
    useSourceMaps: false,

    // If present and truthy, instructs the loader to consume the cache of layer member modules
    noref: true,

    // Uses Closure Compiler as the JavaScript minifier. This can also be set to "shrinksafe" to use ShrinkSafe,
    // though ShrinkSafe is deprecated and not recommended.
    // This option defaults to "" (no compression) if not provided.
    //set to false for faster builds only building layers
    optimize: 'closure',

    // We're building layers, so we need to set the minifier to use for those, too.
    // This defaults to "shrinksafe" if not provided.
    // Set to uglify for faster builds
    layerOptimize: 'closure',

    // Strips all calls to console functions within the code. You can also set this to "warn" to strip everything
    // but console.error, and any other truthy value to strip everything but console.warn and console.error.
    // This defaults to "normal" (strip all but warn and error) if not provided.
    stripConsole: 'normal',

    // The default selector engine is not included by default in a dojo.js build in order to make mobile builds
    // smaller. We add it back here to avoid that extra HTTP request. There is also a "lite" selector available; if
    // you use that, you will need to set the `selectorEngine` property in `app/run.js`, too. (The "lite" engine is
    // only suitable if you are not supporting IE7 and earlier.)
    selectorEngine: 'lite',

    packages: [
        // If you are registering a package that has an identical name and location, you can just pass a string
        // instead, and it will configure it using that string for both the "name" and "location" properties. Handy!
        {
            name: 'dojo',
            location: 'node_modules/dojo'
        },
        {
            name: 'widgets',
            location: '../',
            resourceTags: {
                ignore: function(filename, mid) {
                    // only include Mapillary widget
                    return !/Mapillary/.test(mid) || /\/node_modules\//.test(mid) || /Gruntfile/.test(filename);
                }
            }
        }
        /*{
            name: 'dijit',
            location: 'node_modules/dijit'
        },
        {
            name: 'dstore',
            location: 'node_modules/dojo-dstore',
            resourceTags: {
                ignore: function(filename, mid){
                    return /\/node_modules\//.test(mid);
                }
            }
        },
        {
            name: 'dgrid',
            location: 'node_modules/dgrid',
            resourceTags: {
                ignore: function(filename, mid){
                    return /\/node_modules\//.test(mid);
                }
            }
        },
        {
            name: 'dgrid1',
            location: 'node_modules/dgrid1'
        },
        {
            name: 'esri',
            location: 'node_modules/arcgis-js-api'
        },
        {
            name: 'jimu',
            location: '../../jimu.js'
        }*/
    ],

    // plugins: {
    // 	"xstyle/css": "xstyle/build/amd-css"
    // },

    map: {

        'arcgis-js-api': 'esri'
        /*globalize: {
            "cldr": "cldrjs/dist/cldr",
            "cldr/event": "cldrjs/dist/cldr/event",
            "cldr/supplemental": "cldrjs/dist/cldr/supplemental",
            "cldr/unresolved": "cldrjs/dist/cldr/unresolved"
        }*/
    },

    // Builds can be split into multiple different JavaScript files called "layers". This allows applications to
    // defer loading large sections of code until they are actually required while still allowing multiple modules to
    // be compiled into a single file.
    layers: {
        //IMPORTANT make sure the first layer is the one that will get the modules from config.json by default
        //appConfigFile adds config.json modules to first layer
        "widgets/Mapillary/Widget": {
            targetStylesheet: "css/style.css",
            //any dependencies for module app/main.js get discover and added to this layer
            include: [
                "widgets/Mapillary/Widget",
                "widgets/Mapillary/setting/Setting"
                // widgets/Mapillary/lib/async
                // widgets/Mapillary/lib/mapillary-js/mapillary.min
                // widgets/Mapillary/mapillary-objects/MapillaryObjects
                // widgets/Mapillary/mapillary-objects/MapillaryMarkers
                // widgets/Mapillary/TagCloud
                // widgets/Mapillary/TagCloud.html
                // widgets/Mapillary/lib/GeoJsonLayer
                // widgets/Mapillary/mapillaryUtils
                // widgets/Mapillary/lib/terraformer
            ],
            exclude: [
                "dojo/_base/declare",
                "dojo/html",
                "dojo/parser",
                "dojo/dom-class",
                "dojo/date/stamp",
                "dojo/debounce",
                "dojo/promise/all",
                "dojo/store/Memory",
                "dojo/store/util/QueryResults",
                "dojo/store/util/SimpleQueryEngine",
                "dojo/date/locale",
                "dojo/date",
                "dojo/cldr/supplemental",
                "dojo/i18n",
                "dojo/regexp",
                "dojo/string",
                "dojo/cldr/nls/gregorian",
                "dojo/request",
                "dojo/request/default",
                "dojo/text",
                "dojo/_base/url",
                "dojo/store/Observable"
            ]
        },
        "dojo/dojo": {
            customBase: true,
            discard: true,
            dependencies:
                [
                    "dojo/dojo",
                    "dojo/_base/declare",
                    "dojo/html",
                    "dojo/parser",
                    "dojo/dom-class",
                    "dojo/date/stamp",
                    "dojo/debounce",
                    "dojo/promise/all",
                    "dojo/store/Memory",
                    "dojo/store/util/QueryResults",
                    "dojo/store/util/SimpleQueryEngine",
                    "dojo/date/locale",
                    "dojo/date",
                    "dojo/cldr/supplemental",
                    "dojo/i18n",
                    "dojo/regexp",
                    "dojo/string",
                    "dojo/cldr/nls/gregorian",
                    "dojo/request",
                    "dojo/request/default",
                    "dojo/text",
                    "dojo/_base/url",
                    "dojo/store/Observable"
                ]
        }
    },


    // Default config
    defaultConfig: {
        async: 1,
        hasCache:{
            // these are the values given above, not-built client code may test for these so they need to be available
            "dojo-built": 1,
            "dojo-loader": 1,
            "dojo-undef-api": 0,
            dom: 1,
            "host-node": 0,
            "host-browser": 1,

            // Disable deferred instrumentation by default in the built version.
            "config-deferredInstrumentation": 0,

            // Dojo loader has built-in "has" api. Since dojoConfig is used
            // by Dojo loader, we can set the default here.
            "dojo-has-api": 1,

            // default
            "config-selectorEngine": "lite",

            "esri-featurelayer-webgl": 0,

            "esri-promise-compatibility": 0,
            "esri-promise-compatibility-deprecation-warnings": 1,

            "version-private": 0,
            "version-edit": 0,
            "version-viewer": 1
        },
        aliases: [
            [/^arcgis-js-api/, function(){return "esri";}]
            //[/^webgl-engine/, function(){return "esri/views/3d/webgl-engine";}]
        ],
        packages: [
            {
                name: "dojo"
            },
            {
                name: "widget"
            }
        ]
    },

    // Providing hints to the build system allows code to be conditionally removed on a more granular level than
    // simple module dependencies can allow. This is especially useful for creating tiny mobile builds.
    // Keep in mind that dead code removal only happens in minifiers that support it! Currently, only Closure Compiler
    // to the Dojo build system with dead code removal.
    // A documented list of has-flags in use within the toolkit can be found at
    // <http://dojotoolkit.org/reference-guide/dojo/has.html>.
    staticHasFeatures: {
        "version-private": 0,
        "version-edit": 0,
        "version-viewer": 1,
        "mapillary-dev": 0,

        "config-dojo-loader-catches": 0,
        "config-tlmSiblingOfDojo": 0,
        "dojo-amd-factory-scan": 0,
        "dojo-combo-api": 0,
        "dojo-config-api": 1,
        "dojo-config-require": 0,
        "dojo-debug-messages": 0,
        "dojo-dom-ready-api": 1,
        "dojo-firebug": 0,
        "dojo-guarantee-console": 1,

        // https://dojotoolkit.org/documentation/tutorials/1.10/device_optimized_builds/index.html
        // https://dojotoolkit.org/reference-guide/1.10/dojo/has.html
        "dom-addeventlistener": 1,
        "dom-qsa": 1,
        "dom-qsa2.1": 1,
        "dom-qsa3": 1,
        "dom-matches-selector": 1,
        "json-stringify": 1,
        "json-parse": 1,
        "bug-for-in-skips-shadowed": 0,
        "native-xhr": 1,
        "native-xhr2": 1,
        "native-formdata": 1,
        "native-response-type": 1,
        "native-xhr2-blob": 1,
        "dom-parser": 1,
        "activex": 0,
        "script-readystatechange": 1,
        "ie-event-behavior": 0,
        "MSPointer": 0,
        "touch-action": 1,
        "dom-quirks": 0,
        "array-extensible": 1,
        "console-as-object": 1,
        "jscript": 0,
        "event-focusin": 1,
        "events-mouseenter": 1,
        "events-mousewheel": 1,
        "event-orientationchange": 1,
        "event-stopimmediatepropagation": 1,
        "touch-can-modify-event-delegate": 0,
        "dom-textContent": 1,
        "dom-attributes-explicit": 1,

        // unsupported browsers
        "air": 0,
        "wp": 0,
        "khtml": 0,
        "wii": 0,
        "quirks": 0,
        "bb": 0,
        "msapp": 0,
        "opr": 0,
        "android": 0,

        "svg": 1,

        // Deferred Instrumentation is disabled by default in the built version
        // of the API but we still want to enable users to activate it.
        // Set to -1 so the flag is not removed from the built version.
        "config-deferredInstrumentation": -1,

        // Dojo loader will have "has" api, but other loaders such as
        // RequireJS do not. So, let"s not mark it static.
        // This will allow RequireJS loader to fetch our modules.
        "dojo-has-api": -1,

        "dojo-inject-api": 1,
        "dojo-loader": 1,
        "dojo-log-api": 0,
        "dojo-modulePaths": 0,
        "dojo-moduleUrl": 0,
        "dojo-publish-privates": 0,
        "dojo-requirejs-api": 0,
        "dojo-sniff": 0,
        "dojo-sync-loader": 0,
        "dojo-test-sniff": 0,
        "dojo-timeout-api": 0,
        "dojo-trace-api": 0,
        //"dojo-undef-api": 0,
        "dojo-v1x-i18n-Api": 1, // we still need i18n.getLocalization
        "dojo-xhr-factory": 0,
        "dom": 1,
        "host-browser": 1,
        "extend-dojo": 1,
        "extend-esri": 0,

        "esri-webpack": 0
    }
};
if (typeof module !== 'undefined') { module.exports = profile; }
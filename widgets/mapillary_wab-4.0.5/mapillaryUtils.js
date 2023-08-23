define([
    'require',
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/window',
    'dojo/has',
    'dojo/on',
    'dojo/request',
    'esri/request',
    'dojo/io-query',
    'dojo/Deferred',
    'dojo/promise/all',
    'dojo/Evented',

    'esri/layers/VectorTileLayer',
    'esri/symbols/SimpleLineSymbol',
    'esri/symbols/SimpleMarkerSymbol',
    'esri/symbols/PictureMarkerSymbol',
    "esri/renderers/SimpleRenderer",
    'esri/geometry/webMercatorUtils',

    'jimu/MapManager',

    //'dojo/text!//mapillary.maps.arcgis.com/sharing/rest/content/items/f1aef216d5574687b2151a919e172fed/resources/styles/root.json',
    'dojo/text!./mapillary-style.json',
    'dojo/text!./mapillary-private-style.json',
    'dojo/text!./object-tiles.json',
    './lib/async',
    './lib/mapillary-js/mapillary.min'
], function(localRequire, declare, lang, window, has, on, request, esriRequest, ioQuery, Deferred, all, Evented,
            VectorTileLayer, SimpleLineSymbol, SimpleMarkerSymbol, PictureMarkerSymbol, SimpleRenderer, webMercatorUtils,
            MapManager,
            layersJson, privateLayersJsonString, vectorLayerJsonString,
            async,
            Mapillary) {

    var privateLayersJson,
        organizationLayersJson,
        vectorLayerJson,
        authwin,
        authDef,
        authToken,
        currentUser;

    try {
        layersJson = JSON.parse(layersJson);
        privateLayersJson = JSON.parse(privateLayersJsonString);
        organizationLayersJson = JSON.parse(privateLayersJsonString);
        vectorLayerJson = JSON.parse(vectorLayerJsonString);
    } catch (e) {
        console.error(e);
    }

    /**
     * Mapillary Utils
     * @lends mapillaryUtils
     */
    return new declare([Evented], {
        updateUrl: 'https://marketplace.arcgis.com/listing.html?id=',
        Mapillary: Mapillary,
        layersJson: null,
        organizationLayersJson: null,
        privateLayersJson: null,
        vectorLayerJson: null,
        authScope: 'mapillary:user',
        clientId: null,
        clientSecret: null,
        callbackUrl: null,

        /**
         * API Request
         * @param url
         * @param requestParams
         * @returns {*}
         * @private
         */
        _request: function(url, method) {
            var def = new Deferred();          
            if (method === "POST"){
                var _params = {
                    handleAs: 'json',
                    headers: {
                        'Content-Type': 'application/json',
                        //'X-Requested-With': null,
                    },
                    query: lang.mixin({
                        client_id: this.clientId
                    }, {})
                };
                _params.headers.Authorization = 'OAuth ' + this.clientSecret;
                var _request = request.post(url, _params, {
                    failOk: true,
                    useProxy: false,
                    usePost: true
                });
            } else if (method === "GET"){
                var _params = {
                    handleAs: 'blob',
                    headers: {
                        //'Accept-Encoding': 'gzip, deflate',
                          'X-Requested-With': null,
                    },
                    query: lang.mixin({
                        access_token: authToken
                    }, {})
                };
                //_params.headers.Authorization = 'OAuth ' + authToken;
                var _request = request(url, _params, {
                    //failOk: true,
                    //useProxy: false,
                    //usePost: false
                });
            } else {
                console.log("Invalid Method") //TODO: Add handling
            }

            
            _request.then(function(result) {
                //console.log(result);
                if (method === "GET"){
                //     var reader = new FileReader();
                //     reader.addEventListener("loadend", function() {
                //     //console.log(reader);
                //     def.resolve(reader.result);
                //    });
                //     result = reader.readAsDataURL(new Blob([result], {
                //         type: "application/x-protobuf"
                //     }));
                    
                }
                //var linkHeader    = _request.response.getHeader('Link'),
                //    linkRegex = /<http(s):\/\/[^\?]+\?([^#>]+)>; rel="([\w]+)"/g,
                //    linkHeaders = linkHeader && linkHeader.match(linkRegex) || [],
                //    linkHeaderUrl;
                //linkHeaders.forEach(function(link) {
                //    linkHeaderUrl = link.match(linkRegex);
                //    if (linkHeaderUrl && linkHeaderUrl[3] === 'next')
                //        result.nextLink = linkHeaderUrl[2];
                //});
            
                def.resolve(result);
            }, function(err) {
                def.reject(err);
            });
            return def.promise;
        },

        /**
         * Cancel any pending requests
         */
        cancelRequests: function() {
            if (this.requestDef && !this.requestDef.isFulfilled())
                this.requestDef.cancel("ABORTED");
            if (this._imageRequestDef && !this._imageRequestDef.isFulfilled())
                this._imageRequestDef.cancel("ABORTED");
            if (this._sequenceRequestDef && !this._sequenceRequestDef.isFulfilled())
                this._sequenceRequestDef.cancel("ABORTED");
        },

        /**
         * Get Auth Token
         * @private
         */
        _getSavedAuthToken: function() {
            if (typeof(window.global.Storage) !== 'undefined') {
                return window.global.localStorage.getItem('access_token');
            } else {
                // Sorry! No Web Storage support..
            }
        },

        /**
         * Save Auth Token
         * @private
         */
        _saveAuthToken: function(token) {
            if (typeof(window.global.Storage) !== 'undefined') {
                if (token)
                    return window.global.localStorage.setItem('access_token', token);
                else
                    return window.global.localStorage.removeItem('access_token');
            } else {
                // Sorry! No Web Storage support..
            }
        },

        /**
         * Filter Request Options
         * @param requestOptions
         * @param filter
         * @returns {*}
         * @private
         */
        _filterRequestOptions: function(requestOptions, filter) {
            if (filter.toDate) {
                //ensure date is UTC
                filter.toDate.setTime(filter.toDate.getTime() - filter.toDate.getTimezoneOffset() * 60 * 1000);
                requestOptions.end_time = filter.toDate.toISOString();
            }
            if (filter.fromDate) {
                //ensure date is UTC
                filter.fromDate.setTime(filter.fromDate.getTime() - filter.fromDate.getTimezoneOffset() * 60 * 1000);
                requestOptions.start_time = filter.fromDate.toISOString();
            }
            if (filter.userList && filter.userList.length)
                requestOptions.usernames = filter.userList.map(function(user) {
                    return user.username;
                }).join(',');
            return requestOptions;
        },

        /**
         * Set Config
         * @param config
         * @returns {mapillaryUtils}
         */
        setConfig: function(config) {
            this.config = config;
            return this;
        },

        /**
         * Set App
         * @param app
         * @returns {mapillaryUtils}
         */
        setApp: function(app) {
            this.app = app;
            var wabVersion = this.app && (this.app.wabVersion || this.app.configWabVersion);

            if (this.compareSemVer(wabVersion, '2.7') <= 0) {
                [].concat(layersJson.layers, privateLayersJson.layers, organizationLayersJson.layers, vectorLayerJson.layers).forEach(function (layer) {
                    if (layer.type === 'circle') {
                        layer.type = 'symbol';
                        layer.layout = {
                            "icon-image": "Mapillary Coverage/SBGABF4L662Q",
                            "icon-allow-overlap": true,
                            "icon-size": 0.7
                        };
                        layer.paint = {
                            "icon-opacity": 0.8
                        };
                    }
                });
            }
            return this;
        },

        /**
         * Get App
         * @returns {*}
         */
        getApp: function() {
            return this.app;
        },

        /**
         * Set Client ID
         * @param clientId
         * @returns {mapillaryUtils}
         */
        setClientId: function(clientId) {
            this.clientId = clientId;
            return this;
        },

         /**
         * Set Client ID
         */
          setClientSecret: function(clientSecret) {
            this.clientSecret = clientSecret;
            return this;
        },

        /**
         * Get Client ID
         * @returns {null}
         */
        getClientId: function() {
            return this.clientId;
        },

        /**
         * Set Auth Token
         * @param token
         * @returns {global.mapillaryUtils}
         */
        setAuthToken: function (token) {
            authToken = token;
            //for (var instance in this.mapillary) {
            //    if (this.mapillary.hasOwnProperty(instance))
                    //this.mapillary[instance].setAuthToken(authToken);
            //}
            if (token && authDef && !authDef.isFulfilled()) {
                this.callbackOAuth(token);
			}
            return this;
        },

        /**
         * Save Auth Error
         * @param err
         */
        setAuthError: function(err) {
            this.callbackOAuth(new Error(err));
            return this;
        },

        /**
         * Get Auth Token
         * @returns {*}
         */
        getAuthToken: function() {
            return authToken;
        },

        /**
         * Set Auth Scope
         * @param authScope
         * @returns {mapillaryUtils}
         */
        setAuthScope: function(authScope) {
            this.authScope = authScope;
            return this;
        },

        /**
         * Get Auth Scope
         * @returns {string}
         */
        getAuthScope: function() {
            return this.authScope;
        },

        /**
         * Set Callback URL
         * @param url
         * @returns {mapillaryUtils}
         */
        setCallbackUrl: function(url) {
            this.callbackUrl = url;
            return this;
        },

        /**
         * Get Callback URL
         * @returns {null}
         */
        getCallbackUrl: function() {
            return this.callbackUrl;
        },

        /**
         * Authenticate
         * @param prompt bool Prompt user to login
         */
        authenticate: function(prompt) {
            window.global.mapillary = {};
            window.global.mapillary.require = localRequire; // Make the locally-scoped require available to the remote window
            popup = false
            _token = authToken || this._getSavedAuthToken();

            if (_token && _token !== '') {
                var that = this;
                return promise = new Promise(function(resolve, reject){ 
                    that.setAuthToken(_token);
                    resolve();
                })
            }
            else if (prompt) {
                var that = this
                var url = 'https://www.mapillary.com/connect?client_id=' + this.clientId + '&state=return';
                authWindow = window.global.open(url, "mapillaryAuth", "toolbar=no,scrollbars=no,resizable=no,left=100,top=100,width=800,height=500", true)

                if (authWindow) {
                    authWindow.focus();           
                } 

                return promise = new Promise(function(resolve, reject){ 
                    window.global.addEventListener("storage", function(event){
                        console.log("code", event)
                        if (event.key === "code"){
                            return that.getToken(event.newValue).then(lang.hitch(this, function (access_token) {
                                that.setAuthToken(access_token.access_token);
                                that._saveAuthToken(access_token.access_token);
                                window.global.history.pushState(null, document.title, window.global.location.href.substring(0, window.global.location.href.indexOf("?")-1));
                                resolve();          
                            })); 
                        }
                    }, true);
                });               
            } else {
                 return new Promise(function(resolve, reject){
                     reject();
                 })
             }
        },

        /**
         * Deauthenticate
         * @returns {*}
         */
        deauthenticate: function(err) {
            if (currentUser && authToken)
                this.emit('deauthenticate', err);
            currentUser = null;
            authToken = null;
            this.setAuthToken(null);
            return this._saveAuthToken(null);
        },

        getImage: function(z, x, y) {
            return this._request(`https://tiles.mapillary.com/maps/vtp/mly1_public/2/${z}/${y}/${x}`, "GET").then(lang.hitch(this, function(access_token) {
                var def = new Deferred();
                def.resolve(access_token);
                return def.promise;
            }));
        }, 
        /**
        * Get Token
        */
        getToken: function(code) {
            return this._request(`https://graph.mapillary.com/token?code=${code}&grant_type=authorization_code`, "POST").then(lang.hitch(this, function(access_token) {
                var def = new Deferred();
                def.resolve(access_token);
                return def.promise;
            }));
        },

        /**
         * Callback OAuth
         * @param response
         */
        callbackOAuth: function(response) {
            if (!authDef)
                return false;
            var error = (response instanceof Error && response.message) || (response && response.error);
            if (error)
                authDef.reject(error);
            else {
                authDef.resolve(response);
                //this.getCurrentUser().then(function(user) {
                this.emit('authenticate');
                //}.bind(this));
            }
        },

        /**
         * Is Authenticated
         * @returns {*}
         */
        //isAuthenticated: function() {
        //    return this.getCurrentUser();
        //},

        /**
         * Compare Sem Ver
         * https://github.com/substack/semver-compare/blob/master/index.js
         */
        compareSemVer: function cmp (a, b) {
            var pa = a.split('.')
            var pb = b.split('.')
            for (var i = 0; i < 3; i++) {
                var na = Number(pa[i])
                var nb = Number(pb[i])
                if (na > nb) return 1
                if (nb > na) return -1
                if (!isNaN(na) && isNaN(nb)) return 1
                if (isNaN(na) && !isNaN(nb)) return -1
            }
            return 0
        },

        /**
         * Get Widget Versions
         */
        getWidgetVersions: function() {
            return this._request('https://a.mapillary.com/versions').then(lang.hitch(this, function(widgets) {
                var def = new Deferred();
                def.resolve(widgets);
                return def.promise;
            }));
        },


        /**
         * Get Widget Versions
         */
        getWidgetVersion: function(profile) {
            return this.getWidgetVersions().then(lang.hitch(this, function(widgets) {
                var def = new Deferred();
                if (!widgets.hasOwnProperty(profile))
                    def.reject('Version not found.');
                else
                    def.resolve(widgets[profile]);
                return def.promise;
            }));
        },

        /**
         * Get Current User
         * @returns {*}
         */
        getCurrentUser: function() {
            var def = new Deferred();
            if (!(authDef && authDef.isResolved())) {
                def.reject({
                    error: 'Not Authenticated'
                });
                return def.promise;
            }
            if (currentUser) {
                def.resolve(currentUser);
                return def.promise;
            }
            this._request('https://a.mapillary.com/v3/me').then(function(user) {
                var userDef = new Deferred();
                if (!user || user.message) {
                    this._saveAuthToken(null);
                    userDef.reject(user);
                } else {
                    currentUser = user;
                    userDef.resolve(currentUser);
                }
                return userDef.promise;
            }).then(lang.hitch(this, function(user) {
                var def = new Deferred();
                if (!user || !user.key) {
                    def.reject();
                } else {
                    this.getUserOrganizations(user.key).then(def.resolve,def.reject);
                }
                return def.promise;
            })).then(lang.hitch(this, function(organizations) {
                currentUser.organizations = organizations;
                //console.log('MapillaryUtils::getCurrentUser', currentUser);
                def.resolve(currentUser);
            })).otherwise(lang.hitch(this, function(err) {
                this._saveAuthToken(null);
                def.reject(err);
            }));
            return def.promise;
        },

        /**
         * Get User
         * @param userKey
         * @returns {*}
         */
        getUser: function(userKey) {
            return this._request('https://a.mapillary.com/v3/users/' + userKey);
        },

        /**
         * Get User Organizations
         * @param userKey
         * @param requestParams
         * @returns {*}
         */
        getUserOrganizations: function(userKey, requestParams) {
            var def = new Deferred();
            requestParams = requestParams || {};
            //console.log('MapillaryUtils::getUserProjects', userKey);
            all([
                this._request('https://a.mapillary.com/v3/users/' + userKey + '/organizations', lang.mixin({allowed_integrations: 'wab-1'}, requestParams || {})),
                this._request('https://a.mapillary.com/v3/users/' + userKey + '/organizations', lang.mixin({allowed_integrations: 'wab-2'}, requestParams || {}))
            ]).then(lang.hitch(this, function(res) {
                var wab1 = res[0],
                    wab2 = res[1],
                    wab1Index = {},
                    wab2Index = {},
                    orgIndex = {},
                    uniqueOrgs = [],
                    orgs = wab1.concat(wab2);
                wab1.forEach(function(org) {
                    if (!wab1Index[org.key]) {
                        wab1Index[org.key] = true;
                    }
                });
                wab2.forEach(function(org) {
                    if (!wab2Index[org.key]) {
                        wab2Index[org.key] = true;
                    }
                });
                orgs.forEach(function(org) {
                    if (!orgIndex[org.key]) {
                        orgIndex[org.key] = true;
                        org.permissions = [];
                        if (wab1Index[org.key])
                            org.permissions.push('wab-1');
                        if (wab2Index[org.key])
                            org.permissions.push('wab-2');
                        uniqueOrgs.push(org);
                    }
                });
                def.resolve(uniqueOrgs.sort(function(a,b) {
                    if (a.nice_name < b.nice_name)
                        return -1;
                    else if (a.nice_name > b.nice_name)
                        return 1;
                    else
                        return 0;
                }));
            }));
            return def.promise;
        },

        /**
         * Get User Projects
         * @param userKey string
         * @param requestParams object
         */
        getUserProjects: function(userKey, requestParams) {
            requestParams = requestParams || {};
            //console.log('MapillaryUtils::getUserProjects', userKey);
            return this._request('https://a.mapillary.com/v3/users/' + userKey + '/projects', lang.mixin({}, requestParams || {}));
        },

        /**
         * Look at Point
         * @param point
         * @param filter
         */
        lookAtPoint: function(point, filter) {
            filter = filter || {};
            var requestOptions = {
                'closeto': point.x.toFixed(10) + ',' + point.y.toFixed(10),
                'lookat': point.x.toFixed(10) + ',' + point.y.toFixed(10),
                'radius': 2000
            };
            requestOptions = this._filterRequestOptions(requestOptions, filter);

            if (filter.orgId && filter.orgId !== 'public')
                requestOptions.organization_keys = filter.orgId;

            //console.log('mapillaryUtils::lookAtPoint', point, requestOptions);
            return this._request('https://a.mapillary.com/v3/images', requestOptions);
        },

        /**
         * Image Search
         * @param filter
         *  bbox	        number[]	Filter by the bounding box, given as  minx,miny,maxx,maxy.
         *  closeto	        number[]	Filter by a location that images are close to, given as  longitude,latitude.
         *  end_time	    Date	    Filter images that are captured before  end_time.
         *  lookat	        number[]	Filter images that images are taken in the direction of the specified location given as  longitude,latitude.
         *  project_keys	Key[]	    Filter images by projects, given as project keys.
         *  radius	        number      Filter images within the radius around the  closeto location (default  100 meters).
         *  start_time	    Date    	Filter images that are captured since  start_time.
         *  userkeys	    Key[]	    Filter images captured by users, given as user keys.
         *  usernames	    string[]	Filter images captured by users, given as usernames.
         * @returns {*}
         */
        imageSearch: function(filter) {
            filter = filter || {};
            var def = new Deferred(),
                requestOptions = {
                    per_page: filter.per_page || filter.max || 200
                },
                nextLink,
                results = [];

            for (var i in filter) {
                if (filter.hasOwnProperty(i) && ['bbox','closeto','end_time','lookat','project_keys','radius','start_time','userkeys','usernames','private'].indexOf(i) > -1)
                    requestOptions[i] = filter[i];
            }
            var isMapClick = typeof filter.coverage !== 'undefined',
                isOrgFilter = !filter.coverage && (filter.organization || typeof filter.private !== 'undefined');

            if (isMapClick && !filter.coverage && !filter.organization && !filter.private) {
                console.error("No layers visible on map.");
                def.reject();
                return def.promise;
            }

            if (filter.orgId && filter.orgId !== 'public' && (!isMapClick || (isMapClick && isOrgFilter))) {
                requestOptions.organization_keys = filter.orgId;
            }

            requestOptions = this._filterRequestOptions(requestOptions, filter);
            //console.log('mapillaryUtils::imageSearch', requestOptions);

            async.doUntil(lang.hitch(this, function(callback) {
                // cancel pending request
                /*if (this._imageRequestDef && !this._imageRequestDef.isFulfilled()) {
                    this._imageRequestDef.cancel("ABORTED");
                }*/
                if (nextLink) {
                    var query = ioQuery.queryToObject(nextLink);
                    if (query)
                        requestOptions = lang.mixin(requestOptions, query);
                }
                this._imageRequestDef = this._request('https://a.mapillary.com/v3/images', requestOptions).then(lang.hitch(this, function(res) {
                    results = results.concat(res.features);
                    // clear nextLink if at max
                    if (filter.max && (results.length >= filter.max))
                        nextLink = null;
                    else
                        nextLink = res.nextLink;
                    callback(null, res);
                }), function(err) {
                    nextLink = null;
                    callback(err);
                });
            }), function() { return !nextLink; }, lang.hitch(this, function done(err) {
                if (err)
                    def.reject(err);
                else {
                    def.resolve({
                        type: "FeatureCollection",
                        features: results
                    });
                }
            }));
            return def.promise;
        },

        /**
         * User Fuzzy Search
         * @param username string
         * @param requestParams object
         */
        userFuzzySearch: function(username, requestParams) {
            requestParams = requestParams || {};
            return this._request('https://a.mapillary.com/v3/model.json', lang.mixin({
                paths: JSON.stringify([
                    ["userFuzzySearch", username, {"from": 0, "to": username.length},
                        ["avatar", "key", "username"]]
                ]),
                method: 'get'
            }, requestParams)).then(lang.hitch(this, function(userResults) {
                var users = [];
                for (var user in userResults.jsonGraph.userFuzzySearch[username]) {
                    if (userResults.jsonGraph.userFuzzySearch[username].hasOwnProperty(user))
                        users.push(userResults.jsonGraph.userFuzzySearch[username][user].username.value);
                }
                return this._request('https://a.mapillary.com/v3/users', lang.mixin({
                    usernames: users.join(','),
                    method: 'get'
                }, requestParams));
            })).then(lang.hitch(this, function(result) {
                var def = new Deferred();
                def.resolve(result);
                return def.promise;
            }));
        },

        /**
         * Feed Items By User Key
         * @param userKey string
         * @param requestParams object
         */
        feedItemsByUserKey: function(userKey, requestParams) {
            requestParams = requestParams || {};
            return this._request('https://a.mapillary.com/v3/model.json', lang.mixin({
                paths: JSON.stringify([
                    [
                        "feedItemsByUserKey",
                        userKey,
                        {"from": 0, "to": userKey.length},
                        ["action_type", "closed", "closed_at", "key", "nbr_objects", "object_type", "objects", "shape", "started_at", "subject_id", "subject_type", "updated_at"]
                    ]
                ]),
                method: 'get'
            }, requestParams));
        },

        /**
         * Image Close To
         * @param point
         * @param filter
         * @param requestParams
         * @returns {*}
         */
        imageCloseTo: function(point, filter, requestParams) {
            requestParams = requestParams || {};
            return this._request('https://a.mapillary.com/v3/model.json', lang.mixin({
                paths: JSON.stringify([
                    [
                        "imageCloseTo", point.x.toFixed(10) + ':' + point.y.toFixed(10),
                        ["atomic_scale", "c_rotation", "ca", "calt", "captured_at", "cca", "cfocal", "cl", "gpano", "height", "key", "l", "merge_cc", "merge_version", "orientation", "project", "sequence", "user", "width"],
                        ["key", "username"]
                    ]
                ]),
                method: 'get'
            }, requestParams));
        },

        /**
         * Image By User Key
         * @param imageKey string
         * @param requestParams object
         */
        imageByKey: function(imageKey, requestParams) {
            requestParams = requestParams || {};
            return this._request('https://a.mapillary.com/v3/model.json', lang.mixin({
                paths: JSON.stringify([
                    [
                        [
                            "imageByKey",
                            imageKey,
                            ["atomic_scale", "c_rotation", "ca", "calt", "captured_at", "cca", "cfocal", "cl", "gpano", "height", "key", "l", "merge_cc", "merge_version", "orientation", "project", "sequence", "user", "width"],
                            ["key", "username"]
                        ]
                    ]
                ]),
                method: 'get'
            }, requestParams));
        },

        /**
         * Sequence By User Key
         * @param sequenceKey string
         * @param requestParams object
         */
        sequenceByKey: function(sequenceKey, requestParams) {
            requestParams = requestParams || {};
            return this._request('https://a.mapillary.com/v3/model.json', lang.mixin({
                paths: JSON.stringify([
                    [
                        [
                            "sequenceByKey",
                            sequenceKey,
                            "keys"
                        ]
                    ]
                ]),
                method: 'get'
            }, requestParams));
        },

        /**
         * Get Viewer
         * @returns {Mapillary.Viewer}
         */
        getViewer: function(domId, options) {
            if (this.mapillary && this.mapillary[domId])
                return this.mapillary[domId];

            if (!this.mapillary)
                this.mapillary = {};

            var component = lang.mixin({
                mouse: {
                    doubleClickZoom: false
                },
                mapillaryObjects: false,
                marker: true,
                cover: false,
                detection: true,
                attribution: true,
                bearing: true,
                sequence: true,
                direction: {
                    distinguishSequence: true,
                    maxWidth: 460,
                    minWidth: 180
                },
                imagePlane: {
                    imageTiling: true
                },
                stats: true
            }, options && options.component ? options.component : {});
            options = lang.mixin({
                renderMode: Mapillary.RenderMode.Fill,
                transitionMode: Mapillary.TransitionMode.Instantaneous
            }, options || {});
            options.component = component;
            this.mapillary[domId] = new Mapillary.Viewer({
                accessToken: authToken,
                container: domId,
                imageId: null,
                options
            }
                //domId,
                //this.clientId,
                //null,
                //options
            );
            //if (authToken)
            //    this.mapillary[domId].setAuthToken(authToken);
            return this.mapillary[domId];
        },

        /**
         * Destroy Viewer
         * @param domId
         */
        destroyViewer: function(domId) {
            this.mapillary && this.mapillary[domId] && delete this.mapillary[domId];
            return this;
        },

        /**
         *
         * @param map
         */
        setMap: function(map) {
            this.map = map;
            this._attachMapEvents();
            return this;
        },

        /**
         * Attach Layer Events
         * @private
         */
        _attachMapEvents: function() {

        },

        /**
         * Remove Map Events
         * @private
         */
        _removeMapEvents: function() {

        },

        /**
         * Create mapillary Coverage Layer
         * @returns {VectorTileLayer}
         */
        createMapillaryCoverageLayer: function() {
            this.layersJson = lang.clone(layersJson);
            this.layersJson.sources.mapillary.tiles = [`https://tiles.mapillary.com/maps/vtp/mly1_public/2/{z}/{x}/{y}?access_token=${authToken}`]
            this.layersJson.layers.forEach(function(layer) {
                switch (layer.type) {
                    case 'circle':
                        if (this.config.enableAnonymous && this.config.organizationId) {
                            layer.filter = ["==", "organization_id", parseInt(this.config.organizationId)]
                        }
                        layer.paint['circle-color'] = this.config.layerColorPublic;
                        break;
                    case 'line':
                        if (this.config.enableAnonymous && this.config.organizationId) {
                            layer.filter = ["==", "organization_id", parseInt(this.config.organizationId)]
                        }
                        layer.paint['line-color'] = this.config.layerColorPublic;
                        break;
                    case 'fill':
                        if (this.config.enableAnonymous && this.config.organizationId) {
                            layer.filter = ["==", "organization_id", parseInt(this.config.organizationId)]
                        }
                        layer.paint['fill-color'] = this.config.layerColorPublic;
                        break;
                    case 'symbol':
                        break;
                }
            }.bind(this));
            this.publicLayers = new VectorTileLayer(this.layersJson, {
                id: 'Mapillary',
                currentStyleInfo: this.layersJson
            });
            this.publicLayers.on('error', function (err) {
                console.error(err.error);
            });
            return this.publicLayers;
        },

        /**
         * Create mapillary Organization Layer
         * @returns {VectorTileLayer}
         */
        createMapillaryOrganizationCoverageLayer: function(orgId) {
            this.organizationLayersJson = lang.clone(organizationLayersJson);

            this.organizationLayersJson.layers.forEach(function(layer) {
                switch (layer.type) {
                    case 'circle':
                        layer.paint['circle-color'] = this.config.layerColorOrganization;
                        break;
                    case 'line':
                        layer.paint['line-color'] = this.config.layerColorOrganization;
                        break;
                    case 'fill':
                        layer.paint['fill-color'] = this.config.layerColorOrganization;
                        break;
                    case 'symbol':
                        break;
                }
            }.bind(this));
            var source = this.organizationLayersJson.sources['mapillary-source'].tiles[0];
            if (!source.match(/private=false/))
                source = source + (source.match(/\.mvt$/) ? '%3F' : '%26') + 'private=false';
            if (orgId && source.match(/org_id/))
                source = source.replace('{org_id}', orgId);
            if (this.clientId && !source.match(/client_id/))
                source = source + (source.match(/\.mvt$/) ? '%3F' : '%26') + 'client_id=' + this.clientId;
            if (authToken && !source.match(/token/))
                source = source + (source.match(/\.mvt$/) ? '%3F' : '%26') + 'token=' + authToken;

            this.organizationLayersJson.sources['mapillary-source'].tiles[0] = source;
            this.organizationLayers = new VectorTileLayer(this.organizationLayersJson, {
                id: 'Mapillary_Organization',
                currentStyleInfo: this.organizationLayersJson
            });
            this.organizationLayers.on('error', function (err) {
                console.error(err.error);
            });
            return this.organizationLayers;
        },

        /**
         * Create mapillary Coverage Layer
         * @returns {VectorTileLayer}
         */
        createMapillaryPrivateCoverageLayer: function(orgId) {
            this.privateLayersJson = lang.clone(privateLayersJson);
            this.privateLayersJson.layers.forEach(function(layer) {
                switch (layer.type) {
                    case 'circle':
                        layer.paint['circle-color'] = this.config.layerColorPrivate;
                        break;
                    case 'line':
                        layer.paint['line-color'] = this.config.layerColorPrivate;
                        break;
                    case 'fill':
                        layer.paint['fill-color'] = this.config.layerColorPrivate;
                        break;
                    case 'symbol':
                        break;
                }
            }.bind(this));
            var source = this.privateLayersJson.sources['mapillary-source'].tiles[0];
            if (!source.match(/private=true/))
                source = source + (source.match(/\.mvt$/) ? '%3F' : '%26') + 'private=true';
            if (orgId && source.match(/org_id/))
                source = source.replace('{org_id}', orgId);
            if (this.clientId && !source.match(/client_id/))
                source = source + (source.match(/\.mvt$/) ? '%3F' : '%26') + 'client_id=' + this.clientId;
            if (authToken && !source.match(/token/))
                source = source + (source.match(/\.mvt$/) ? '%3F' : '%26') + 'token=' + authToken;

            this.privateLayersJson.sources['mapillary-source'].tiles[0] = source;
            this.privateLayers = new VectorTileLayer(this.privateLayersJson, {
                id: 'Mapillary_Private',
                currentStyleInfo: this.privateLayersJson
            });
            this.privateLayers.on('error', function (err) {
                console.error(err.error);
            });
            return this.privateLayers;
        },

        /**
         * Create Mapillary Objects Layer
         * @returns {VectorTileLayer}
         */
        createMapillaryObjectsLayer: function() {
            if (this.clientId && !this.vectorLayerJson.sources.mapillaryvector.tiles[0].match(/client_id/))
                this.vectorLayerJson.sources.mapillaryvector.tiles[0] = this.vectorLayerJson.sources.mapillaryvector.tiles[0] + (this.vectorLayerJson.sources.mapillaryvector.tiles[0].match(/\?/) ? '&' : '?') + 'client_id=' + this.clientId;
            if (authToken && !this.vectorLayerJson.sources.mapillaryvector.tiles[0].match(/token/))
                this.vectorLayerJson.sources.mapillaryvector.tiles[0] = this.vectorLayerJson.sources.mapillaryvector.tiles[0] + (this.vectorLayerJson.sources.mapillaryvector.tiles[0].match(/\?/) ? '&' : '?') + 'token=' + authToken;
            this.objectLayer = new VectorTileLayer(
                this.vectorLayerJson,
                {id: 'Mapillary_Traffic_Signs'});
            this.objectLayer.on('error', function (err) {
                console.error(err.error);
            });
            return this.objectLayer;
        }, 

         /**
         * Create mapillary Coverage Layer
         * @returns int
         */
        lon2tile: function(lon,zoom) { 
            return (Math.floor((lon+180)/360*Math.pow(2,zoom))); 
        },

        lat2tile: function(lat,zoom)  { 
            return (Math.floor((1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 *Math.pow(2,zoom))); 
        }
    })();
});
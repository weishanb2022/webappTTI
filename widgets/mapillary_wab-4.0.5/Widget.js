/* globals require, define, esri */
define([
    'require',
    './lib/async',
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/window',
    'dojo/_base/array',
    'dojo/has',
    'dojo/dom',
    'dojo/html',
    'dojo/on',
    'dojo/topic',
    'dojo/debounce',
    'dojo/Deferred',
    'dojo/promise/all',
    'dojo/store/Memory',
    "dojo/date/locale",
    'dojo/dom-construct',
    'dojo/dom-style',
    'dojo/dom-class',
    'dojo/dom-attr',
    'dojo/dom-geometry',
    'dojo/query',
    'dojo/io-query',
    'dojo/aspect',

    'dijit/_WidgetsInTemplateMixin',
    'dijit/form/Form',
    'dijit/form/CheckBox',
    'dijit/form/TextBox',
    'dijit/form/DateTextBox',
    'dijit/form/ComboBox',

    'esri/layers/GraphicsLayer',
    'esri/dijit/editing/Editor',
    'esri/toolbars/edit',
    'esri/dijit/editing/TemplatePicker',
    'esri/Color',
    'esri/geometry/Point',
    'esri/tasks/ProjectParameters',
    'esri/geometry/webMercatorUtils',
    'esri/config',
    'esri/graphic',
    'esri/graphicsUtils',
    'esri/tasks/query',
    'esri/InfoTemplate',
    'esri/SpatialReference',
    'esri/symbols/SimpleLineSymbol',
    'esri/symbols/SimpleMarkerSymbol',
    'esri/symbols/PictureMarkerSymbol',

    'jimu/utils',
    'jimu/BaseWidget',
    'jimu/LayerInfos/LayerInfos',
    'jimu/dijit/LoadingIndicator',
    'jimu/dijit/Message',

    './lib/vectortile',
    './lib/pbf',
    
    './mapillaryUtils',
    './mapillary-objects/MapillaryObjects',
    './mapillary-objects/MapillaryMarkers',
    './TagCloud',

    'dojo/text!./config.json'
], function (localRequire, async, declare, lang, window, array, has, dom, html, on, topic, debounce, Deferred, all, Memory, locale, domConstruct, domStyle, domClass, domAttr, domGeometry, domQuery, ioQuery, aspect,
             _WidgetsInTemplateMixin, Form, CheckBox, TextBox, DateTextBox, ComboBox,
             GraphicsLayer, Editor, EditToolbar, TemplatePicker, Color, Point, ProjectParameters, webMercatorUtils, esriConfig, Graphic, graphicsUtils, Query, InfoTemplate, SpatialReference, SimpleLineSymbol, SimpleMarkerSymbol, PictureMarkerSymbol,
             jimuUtils, BaseWidget, LayerInfos, LoadingIndicator, Message,
             VectorTile, Protobuf, 
             mapillaryUtils, MapillaryObjects, MapillaryMarkers, TagCloud, defaultConfig) {

    try {
        defaultConfig = JSON.parse(defaultConfig);
    } catch (e) {

    }

    function getColorBrightness(color) {
        var rgb = color.toRgb();
        return (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
    }

    var addMapillaryLayerInfoIsVisibleEvent;

    /**
     * Mapillary WebApp Builder Widget
     */
    return declare([BaseWidget, _WidgetsInTemplateMixin], {
        baseClass: 'mapillary',

        _mapResizeEvents: null,
        wrapperNode: null,
        mapillaryWrapperNode: null,
        privateIconNode: null,
        authenticationNode: null,
        signInButton: null,
        registerButton: null,
        loggedInNode: null,
        loggedOutNode: null,
        loggedInMenu: null,
        loggedOutMenu: null,
        loggedInUsernameNode: null,
        loggedInUserAvatarNode: null,
        userListNode: null,
        noticeNode: null,
        loginNoticeNode: null,
        loginTextNode: null,
        viewOptionsHeaderNode: null,
        useTransitionsCheckbox: null,
        coverageCheckbox: null,
        mapillarySettings: null,
        noticeTextNode: null,
        userFilterNode: null,
        dateFilterNode: null,
        submitFilterNode: null,
        maximizeNode: null,
        timestampNode: null,
        resetButtonNode: null,
        collapseToggleNode: null,
        collapseWrapperNode: null,
        privateCheckboxNode: null,
        privateCheckboxLabel: null,
        privateCheckbox: null,
        mapillary_client_token: null,
        organizationCheckboxNode: null,
        organizationCheckboxLabel: null,
        organizationCheckbox: null,
        publicZoomIconNode: null,
        organizationZoomIconNode: null,
        privateZoomIconNode: null,
        tiley: null,
        tilex: null,
        sequence_filter: null,

        /**
         * Post Create
         */
        postCreate: function () {
            this.inherited(arguments);
            this.position.height = this.position.height || 500;
            this.position.width = this.position.width || 400;
            //console.log('Mapillary::postCreate');
            this._events = [];

            this.panel = this.getPanel();
            if (this.panel && !domClass.contains(this.panel.domNode, 'mapillary-panel'))
                domClass.add(this.panel.domNode, 'mapillary-panel');

            var _setPanel = function () {
                this.panel = this.getPanel();
                if (this.panel && this.panel.domNode) {
                    this._setPanelStyleClass();
                    var query = domQuery('.title', this.panel.domNode);
                    if (query.length) {
                        this.panel.titleNode = this.panel.titleNode || query[0];
                    }
                    if (this.panel.titleNode) {
                        if (this.authenticationNode.parentNode !== this.panel.titleNode) {
                            if (this.panel.btnsContainer) {
                                domConstruct.place(this.authenticationNode, this.panel.btnsContainer, 'before');
                            } else {
                                domConstruct.place(this.authenticationNode, this.panel.titleNode);
                            }
                        }
                    }
                    domStyle.set(this.authenticationNode, 'display', '');
                    clearInterval(this._interval);
                    this._resizeEvent();
                }
            }.bind(this);
            _setPanel();
            this._interval = setInterval(_setPanel, 100);

            // Enable the Esri Resource Proxy when deployed to Portal
            if(this.config.enableProxy && this.config.proxyUrl){
                esriConfig.defaults.io.proxyUrl = this.config.proxyUrl;
            }
            
            this.privateIconNode.src =  this.folderUrl + 'images/lock.svg';

            this.userList = new TagCloud({
                searchAttr: 'username'
            }, this.userListNode);

            this.own(mapillaryUtils.on('authenticate', function() {
                domStyle.set(this.loggedOutNode, 'display', 'none');
            }.bind(this)));

            this.own(mapillaryUtils.on('deauthenticate', function(error) {
                domStyle.set(this.loggedOutNode, 'display', '');
                domStyle.set(this.loggedInNode, 'display', 'none');
            }.bind(this)));
        },

        /**
         * Startup
         */
        startup: function () {
            this.inherited(arguments);
            //this.coverageDef = new Deferred();
            mapillaryUtils.authDef = new Deferred();
            //console.log('Mapillary::startup');

            this.loginTextNode.innerHTML = this.nls.signInText;
            var mapillary_id = this.config.clientId.split("|")[1];
            mapillaryUtils
                .setClientId(mapillary_id)
                .setClientSecret(this.config.clientSecret)
                //.setAuthScope('private:read')
                //.setCallbackUrl(this.config.callbackUrl || detectedCallbackUrl);
            this._initLoading();
            this._initEvents();
            if(this.config.enableAnonymous){
                
                domStyle.set(this.loginNoticeNode, 'display', 'none');
                domStyle.set(this.loggedOutNode, 'display', 'none');

                mapillaryUtils.setConfig(lang.mixin({}, defaultConfig, this.config)).setApp(this.appConfig).setMap(this.map);
                mapillaryUtils.setAuthToken(this.config.clientId);
                mapillaryUtils._saveAuthToken(this.config.clientId);
                if (!this.map.loaded) {
                    this._mapUpdateEvent = topic.subscribe("mapLoaded", lang.hitch(this, this._addMapillaryCoverageLayerToMap));
                    this.own(this._mapUpdateEvent);
                    this.coverageDef.promise.always(lang.hitch(this, function() {
                        this._mapUpdateEvent.remove();
                    }));
                } else {
                    setTimeout(this._addMapillaryCoverageLayerToMap.bind(this), 500);
                }

                this.own(topic.subscribe("builder/styleChanged", lang.hitch(this, this._setPanelStyleClass)));
        
                if (this.config.mapillaryImage && this.useTransitionsCheckbox) {
                    domStyle.set(this.viewOptionsHeaderNode, 'display', '');
                    domStyle.set(this.useTransitionsCheckbox, 'display', '');
                } else {
                    domStyle.set(this.viewOptionsHeaderNode, 'display', 'none');
                    domStyle.set(this.useTransitionsCheckbox, 'display', 'none');
                }
                this.coverageCheckbox && domStyle.set(this.coverageCheckbox, 'display', '');
                this.mapillarySettings && domStyle.set(this.mapillarySettings, 'display', '');

                if (!this.config.clientId || this.config.clientId === '') {
                    this.noticeTextNode.innerHTML = '<a href="https://www.mapillary.com/dashboard/developers" target="_blank">' + this.nls.registerAppID + '</a>';
                } else {
                    this.noticeTextNode.innerHTML = this.nls.clickMapForLocation;
                }
                this.noticeNode && domStyle.set(this.noticeNode, 'display', '');

                this._configEditor = this.config.editor ? lang.clone(this.config.editor) : {};
                //var origin = (window.location && window.location.origin) || window.global.location.origin; 
                //var detectedCallbackUrl = ( (!this.folderUrl.includes('http') ? origin : '') + this.folderUrl + 'oauth-callback.html');
                this.resize();
                //this.mapillary.resize();
                this._initWidget();
                this.filterMapillaryLayer();
            } else {           
                this.authenticate(true).then(lang.hitch(this, function () {
                    domStyle.set(this.loginNoticeNode, 'display', 'none');
                    domStyle.set(this.loggedOutNode, 'display', 'none');

                    mapillaryUtils.setConfig(lang.mixin({}, defaultConfig, this.config)).setApp(this.appConfig).setMap(this.map);
                    if (!this.map.loaded) {
                        this._mapUpdateEvent = topic.subscribe("mapLoaded", lang.hitch(this, this._addMapillaryCoverageLayerToMap));
                        this.own(this._mapUpdateEvent);
                        this.coverageDef.promise.always(lang.hitch(this, function() {
                            this._mapUpdateEvent.remove();
                        }));
                    } else {
                        setTimeout(this._addMapillaryCoverageLayerToMap.bind(this), 500);
                    }

                    this.own(topic.subscribe("builder/styleChanged", lang.hitch(this, this._setPanelStyleClass)));
            
                    if (this.config.mapillaryImage && this.useTransitionsCheckbox) {
                        domStyle.set(this.viewOptionsHeaderNode, 'display', '');
                        domStyle.set(this.useTransitionsCheckbox, 'display', '');
                    } else {
                        domStyle.set(this.viewOptionsHeaderNode, 'display', 'none');
                        domStyle.set(this.useTransitionsCheckbox, 'display', 'none');
                    }
                    this.coverageCheckbox && domStyle.set(this.coverageCheckbox, 'display', '');
                    this.mapillarySettings && domStyle.set(this.mapillarySettings, 'display', '');

                    if (!this.config.clientId || this.config.clientId === '') {
                        this.noticeTextNode.innerHTML = '<a href="https://www.mapillary.com/dashboard/developers" target="_blank">' + this.nls.registerAppID + '</a>';
                    } else {
                        this.noticeTextNode.innerHTML = this.nls.clickMapForLocation;
                    }
                    this.noticeNode && domStyle.set(this.noticeNode, 'display', '');

                    this._configEditor = this.config.editor ? lang.clone(this.config.editor) : {};
                    //var origin = (window.location && window.location.origin) || window.global.location.origin; 
                    //var detectedCallbackUrl = ( (!this.folderUrl.includes('http') ? origin : '') + this.folderUrl + 'oauth-callback.html');
                    this.resize();
                    //this.mapillary.resize();
                    this._initWidget();
                    this.filterMapillaryLayer();
                }));
            }
        },

        /**
         * Authenticate with Mapillary
         * @param prompt bool Prompt to login
         */
        authenticate: function (prompt) {         
            return mapillaryUtils.authenticate(prompt);
        },

        /**
         * Deauthenticate
         */
        deauthenticate: function() {
            this._resetFilter();
            mapillaryUtils.deauthenticate();
            domStyle.set(this.loggedInMenu, 'display', 'none');
            domStyle.set(this.loggedInNode, 'display', 'none');
            domStyle.set(this.loggedOutNode, 'display', '');
            this.currentUser = null;
        },

        /**
         * Set Panel Style Class
         */
        _setPanelStyleClass: function(style) {
            var panelTitleNode = domQuery('.jimu-panel-title', this.panel.domNode),
                titleLabelNode = domQuery('.jimu-panel-title .title-label', this.panel.domNode),
                color,
                isDarkBackground = function() {
                    return color && getColorBrightness(color) <= 224;
                };

            if (style && style.styleColor) {
                color = Color.fromHex(style.styleColor);
            } else if (this.appConfig.theme && this.appConfig.customStyles) {
                color = Color.fromHex(this.appConfig.theme.customStyles.mainBackgroundColor);
            } else if (panelTitleNode.length && domStyle.get(panelTitleNode[0], 'background-color')) {
                color = Color.fromRgb(domStyle.get(panelTitleNode[0], 'background-color'));
            } else if (titleLabelNode.length && domStyle.get(titleLabelNode[0], 'background-color')) {
                color = Color.fromRgb(domStyle.get(titleLabelNode[0], 'background-color'));
            } else {
                color = Color.fromRgb(domStyle.get(this.panel.domNode, 'background-color'));
            }

            domClass.remove(this.panel.domNode, 'mapillary-panel-b');
            domClass.remove(this.panel.domNode, 'mapillary-panel-w');
            if (isDarkBackground()) {
                domClass.add(this.panel.domNode, 'mapillary-panel-w');
            } else {
                domClass.add(this.panel.domNode, 'mapillary-panel-b');
            }
        },

        /**
         * Set User Node
         * @param username
         * @param avatar
         * @private
         */
        _setUser: function(username, avatar) {
            if (!username)
            {
                throw new Error('Username required.');
            }
            this.loggedInUsernameNode.innerHTML = username;
            domConstruct.empty(this.loggedInUserAvatarNode);
            domConstruct.create('img', {
                src: avatar + '?client_id=' + mapillaryUtils.getClientId()
            }, this.loggedInUserAvatarNode);
        },

        /**
         * Set Default Usernames
         * @private
         */
        _setDefaultUsernames: function() {
            this.userList.reset();
            var users = this.config.defaultUserName && typeof this.config.defaultUserName === 'string' ? this.config.defaultUserName.split(',') : this.config.defaultUserName,
                _users = [];
            async.each(users, lang.hitch(this, function (userName, callback) {
                mapillaryUtils.userFuzzySearch(userName).then(lang.hitch(this, function (users) {
                    var _user = users.filter(lang.hitch(this, function (user) {
                        return user.username === userName;
                    }));
                    if (_user && _user.length) {
                        _users.push(_user[0]);
                        callback(null, _user[0]);
                    } else {
                        callback('Default user not found: ' + userName);
                    }
                }));
            }), lang.hitch(this, function (err) {
                if (err)
                    console.error(err);
                else {
                    _users.map(lang.hitch(this, function (user) {
                        this.userList.addValue(user);
                    }));
                }
            }));
        },

        /**
         * Init Widget
         * @private
         */
        _initWidget: function () {
            //console.log('Mapillary::_initWidget');
            var def = new Deferred();
            domStyle.set(this.form.domNode, 'display', '');
            //domStyle.set(this.submitFilterNode, 'display', '');

            //TODO: VERSION API DEPRICATED - this._checkLatestWidgetVersion().then(lang.hitch(this, this.resize));

            this._createMapillaryViewer({
                transitionMode: this.config.useTransitions ? mapillaryUtils.Mapillary.TransitionMode.Default : mapillaryUtils.Mapillary.TransitionMode.Instantaneous
            });
            this.toggleViewerVisibility(false);

            //FIXME Traffic Signs
            //this.mapillaryObjects.createMapillaryObjectsLayer();
            //this._initTrafficSignLinks();

            this._addMapillaryLayerInfoIsVisibleEventToMap();
            this._addMapillaryClickEventToMap();

            LayerInfos.getInstance(this.map, this.map.itemInfo).then(lang.hitch(this, function (operLayerInfos) {
                this.layerInfos = operLayerInfos;
                this._setFormFromLayerInfos();
                this.useTransitions && this.useTransitions.set('checked', this.config.useTransitions);
                 //all([this.authenticate]).always(lang.hitch(this, function (res) {
                    //var user = res[0];

                    //if (!this.config.hideUserFilter) {
                    //    domStyle.set(this.userFilterNode, 'display', '');
                    //}
                    // allow date filtering
                    domStyle.set(this.dateFilterNode, 'display', '');
                    var hasDefaultOrg = this.config.defaultOrganization && this.config.defaultOrganization !== '';
                        if (!hasDefaultOrg) {
                            this.showMapillaryLayer(true);
                        }
                    // if (!user) {
                    //     if (!this.config.hideAuthentication) {
                    //         domStyle.set(this.loggedInNode, 'display', 'none');
                    //         domStyle.set(this.loggedOutNode, 'display', '');
                    //     }
                    //     this.showMapillaryLayer(true);
                    //     return;
                    // } else {
                    //     var hasDefaultOrg = this.config.defaultOrganization && this.config.defaultOrganization !== '';
                    //     if (!hasDefaultOrg) {
                    //         this.showMapillaryLayer(true);
                    //     }
                    // }

                    if (this.wab2 && this.config.defaultUserName && this.config.defaultUserName !== '') {
                        this._setDefaultUsernames();
                    }
                 //}));
                def.resolve();
            }));
            return def.promise;
        },

        /**
         * Get Form Values
         */
        getFormValues: function () {
            return lang.mixin({}, this.form.get('value'), {
                //userList: this.userList.get('value'),
                //orgId: this.orgId.get('item') ? this.orgId.store.getValue(this.orgId.get('item'), 'key') : null,
                coverage: this.coverage && this.coverage.get('checked'),
                useTransitions: this.useTransitions && this.useTransitions.get('checked'),
                trafficSigns: this.trafficSigns && this.trafficSigns.get('checked'),
                //private: this.privateCheckbox.get('checked'),
                //organization: this.organizationCheckbox.get('checked')
            });
        },

        /**
         * Resize
         */
        resize: function (e) {
            this.inherited(arguments);
            setTimeout(lang.hitch(this, function () {
                if (this.panel && this.panel.closeNode) {
                    if (jimuUtils.inMobileSize()) {
                        domStyle.set(this.panel.closeNode, 'display', 'block');
                    } else {
                        domStyle.set(this.panel.closeNode, 'display', 'none');
                    }
                }
                var width = this.userSearchListNode.clientWidth - this.userList.domNode.clientWidth - 21;
                if (width < 40)
                    width = 40;
                if (this.userList.domNode.clientWidth > 0) {
                    this.userSearch.set('placeholder', '');
                } else {
                    this.userSearch.set('placeholder', this.nls.username);
                }
                domStyle.set(this.userSearch.domNode, 'width', width + 'px');

                if (this.panel && this.panel.domNode && parseFloat(domStyle.get(this.panel.domNode, 'top')) > 0 && parseFloat(domStyle.get(this.panel.domNode, 'right')) > 0) {
                    /*domGeometry.setContentSize(this.panel.domNode, {
                        h: (this.position.height + 150) > window.global.innerHeight ? (window.global.innerHeight - 150) : this.position.height,
                        w: this.position.width
                    });*/
                }
                if (this.mapillary) {
                    var widgetHeight = this.domNode.clientHeight,
                        height = widgetHeight - this.collapseToggleNode.clientHeight - this.updateNode.clientHeight - this.form.domNode.clientHeight,
                        filterNodeHeight = (widgetHeight - this.collapseToggleNode.clientHeight);
                    if (this.panel && domClass.contains(this.panel.domNode, 'jimu-tab-panel')) {
                        height -= 40;
                        filterNodeHeight -= 40;
                    }

                    var isFullscreen = !domClass.contains(this.domNode, 'mini');
                    if (isFullscreen) {
                        domStyle.set(this.mapillary._container._container, 'height', '100%');
                    } else {
                        domStyle.set(this.mapillary._container._container, 'height', height + 'px');
                    }

                    if (this.panel && this.panel.domNode && domClass.contains(this.panel.domNode, 'mapillary-collapse-open') && filterNodeHeight) {
                        domStyle.set(this.collapseWrapperNode, 'height', filterNodeHeight + 'px');
                        domStyle.set(this.collapseToggleNode, 'bottom', filterNodeHeight + 'px');
                    }
                    //console.log('Mapillary::resize');
                    this.mapillary.resize();
                }
            }), 0);
        },

        /**
         * Maximize
         */
        maximize: function () {
            var panel = this.getPanel(),
                isFullscreen = !domClass.contains(this.domNode, 'mini');
            //console.log('Mapillary::maximize');
            if (isFullscreen) {
                domClass.remove(this.map.container, 'mini');
                domClass.add(this.map.container, 'fullscreen');
                domClass.remove(this.domNode, 'fullscreen');
                domClass.add(this.domNode, 'mini');
                if (panel) {
                    domClass.remove(panel.domNode, 'fullscreen');
                    domClass.add(panel.domNode, 'mini');
                }
                domConstruct.place(this.maximizeNode, this.domNode);
                domConstruct.place(this.mapillaryWrapperNode, this.wrapperNode, 'first');
            } else {
                domClass.remove(this.map.container, 'fullscreen');
                domClass.add(this.map.container, 'mini');
                domClass.remove(this.domNode, 'mini');
                domClass.add(this.domNode, 'fullscreen');
                if (panel) {
                    domClass.remove(panel.domNode, 'mini');
                    domClass.add(panel.domNode, 'fullscreen');
                }
                domConstruct.place(this.maximizeNode, this.map.container);
                domConstruct.place(this.mapillaryWrapperNode, window.global.jimuConfig.layoutId);
            }
            setTimeout(this._centerMapAtNode.bind(this), 500);
            this.emit('maximize');
            topic.publish('MapillaryViewerMaximize');
            this._resizeEvent();
        },

        /**
         * Minimize
         */
        minimize: function () {
            var isFullscreen = !domClass.contains(this.domNode, 'mini');
            if (isFullscreen) {
                domStyle.set(this.map.container, 'display', 'none'); //hide map
            } else {
                domQuery('.mly-wrapper', this.domNode).style('display', 'none'); //hide widget
            }
            domStyle.set(this.maximizeNode, 'display', 'none'); //hide maximize
            this.emit('minimize');
            topic.publish('MapillaryViewerMinimize');
            this._resizeEvent();
        },

        /**
         * Toggle Viewer Visibility
         * @param val
         */
        toggleViewerVisibility: function (val) {
            var klaz = 'hide-viewer-content';

            if (val) {
                //this._createMapillaryViewer();
                this.noticeNode && domStyle.set(this.noticeNode, 'display', 'none');
                this.parentEl && this.parentEl.classList.remove(klaz);
            } else {
                //this._destroyMapillaryViewer();
                this.noticeNode && domStyle.set(this.noticeNode, 'display', '');
                this.downloadImage && domStyle.set(this.downloadImage, 'display', 'none');
                this._graphicsLayer && this._graphicsLayer.clear();
                this.parentEl && this.parentEl.classList.add(klaz);
            }
        },

        /**
         * Filter Mapillary Layer
         * Uses VectorTileLayer.setStyle to filter Mapillary layer
         * @param filters object <username,toDate,fromDate,panorama,segmentation>
         */

        filterMapillaryLayer: function (filters) {
            //https://www.mapbox.com/mapbox-gl-style-spec/#types-filter
            this.publicLayerStyle = lang.clone(mapillaryUtils.layersJson);
            //this.privatelayerStyle = this.privateCoverageLayers && lang.clone(mapillaryUtils.privatelayersJson);
            //this.organizationLayerStyle = this.organizationCoverageLayers && lang.clone(mapillaryUtils.organizationLayersJson);
            //var isPublic,
            validFilters = {};

            //ensure filter values are not null, false, or an empty array in the case of a checkbox
            for (var filter in filters) {
                if (!filters.hasOwnProperty(filter))
                    continue;
                var isEmptyArray = (filters[filter] instanceof Array ? filters[filter].length === 0 : false),
                    isNull = !filters[filter] || filters[filter] === '',
                    isEventAttr = ['detail', 'bubbles', 'cancelable'].indexOf(filter) !== -1;
                if (!isEventAttr && !isNull && !isEmptyArray)
                    validFilters[filter] = filters[filter];
            }

            //isPublic = !validFilters.orgId || validFilters.orgId === 'public';

            var mapillaryFilter = [];
            //if (validFilters.userList) {
            //    var userFilter = ['in', 'userKey'];
            //    validFilters.userList.forEach(function (user) {
            //        userFilter.push(user.key);
            //    });
            //    mapillaryFilter.push(userFilter);
            //}
            //if (this.config.enableAnonymous) {
            //    mapillaryFilter.push(['==', 'ownerId', this.config.organizationId]);
            //}
            //if (this.config.enableAnonymous && this.config.organizationId) {
            //    mapillaryFilter.push(["==", "organization_id", this.config.organizationId])
            // }
            if (validFilters.fromDate)
                mapillaryFilter.push(['>=', 'capturedAt', validFilters.fromDate.getTime()]);
            if (validFilters.toDate)
                mapillaryFilter.push(['<=', 'capturedAt', validFilters.toDate.getTime()]);
            //if (validFilters.panorama)
            //    mapillaryFilter.push(['==', 'panorama', 1]);
            //if (validFilters.segmentation)
            //    mapillaryFilter.push(['==', 'segmentation', 1]);
            //if (validFilters.private)
            //    mapillaryFilter.push(['==', 'private', 1]);
            if (mapillaryFilter.length)
                mapillaryFilter.unshift("all");
            this.mapillary && this.mapillary.setFilter(mapillaryFilter.length ? mapillaryFilter : []);
            // /* Organization Layer */
            // this.organizationLayerStyle && this.organizationLayerStyle.layers.forEach(function (layer) {
            //     layer.filter = [];
            //     if (validFilters.userList) {
            //         var userFilter = ['in', 'userkey'];
            //         validFilters.userList.forEach(function (user) {
            //             userFilter.push(user.key);
            //         });
            //         layer.filter.push(userFilter);
            //     }
            //     if (validFilters.fromDate)
            //         layer.filter.push(['>=', 'captured_at', validFilters.fromDate.getTime()]);
            //     if (validFilters.toDate)
            //         layer.filter.push(['<=', 'captured_at', validFilters.toDate.getTime()]);
            //     if (validFilters.panorama)
            //         layer.filter.push(['==', 'panorama', 1]);
            //     if (validFilters.segmentation)
            //         layer.filter.push(['==', 'segmentation', 1]);

            //     if (layer.filter.length)
            //         layer.filter.unshift("all");
            //     else
            //         delete layer.filter;
            // });

            // /* Private Layer */
            // this.privatelayerStyle && this.privatelayerStyle.layers.forEach(function (layer) {
            //     layer.filter = [];
            //     if (validFilters.userList) {
            //         var userFilter = ['in', 'userkey'];
            //         validFilters.userList.forEach(function (user) {
            //             userFilter.push(user.key);
            //         });
            //         layer.filter.push(userFilter);
            //     }
            //     if (validFilters.fromDate)
            //         layer.filter.push(['>=', 'captured_at', validFilters.fromDate.getTime()]);
            //     if (validFilters.toDate)
            //         layer.filter.push(['<=', 'captured_at', validFilters.toDate.getTime()]);
            //     if (validFilters.panorama)
            //         layer.filter.push(['==', 'panorama', 1]);
            //     if (validFilters.private)
            //         layer.filter.push(['==', 'private', 1]);
            //     if (validFilters.segmentation)
            //         layer.filter.push(['==', 'segmentation', 1]);

            //     if (layer.filter.length)
            //         layer.filter.unshift("all");
            //     else
            //         delete layer.filter;
            // });

            /* Public Layer */
            var that = this; 
            this.publicLayerStyle && this.publicLayerStyle.layers.forEach(function (layer) {
                layer.filter = [];
                //if (validFilters.userList) {
                //    var userFilter = ['in', 'userkey'];
                //    validFilters.userList.forEach(function (user) {
                //        userFilter.push(user.key);
                //    });
                //    layer.filter.push(userFilter);
                //}
                //if (that.config.enableAnonymous) {
                //    layer.filter.push(["==", "organization_id", parseInt(that.config.organizationId)])
               // }
                if (validFilters.fromDate)
                    layer.filter.push(['>=', 'captured_at', validFilters.fromDate.getTime()]);
                if (validFilters.toDate)
                    layer.filter.push(['<=', 'captured_at', validFilters.toDate.getTime()]);
                //if (validFilters.panorama)
                //    layer.filter.push(['==', 'panorama', 1]);
                //if (validFilters.segmentation)
                //    layer.filter.push(['==', 'segmentation', 1]);

                if (layer.filter.length)
                    layer.filter.unshift("all");
                else
                    delete layer.filter;
            });

            //this.coverageDef.then(lang.hitch(this, function () {
                this.publicLayerStyle && this.publicCoverageLayers.setStyle(this.publicLayerStyle).then(lang.hitch(this, function () {
                    //console.log("Mapillary::filterMapillaryLayer - public", this.publicLayerStyle);
                }), lang.hitch(this, function (e) {
                    //console.error("Mapillary::filterMapillaryLayer", e, validFilters, this.publicLayerStyle);
                    new Message({
                        type: 'error',
                        message: e.message
                    });
                }));
                this.privatelayerStyle && this.privateCoverageLayers.setStyle(this.privatelayerStyle).then(lang.hitch(this, function () {
                    //console.log("Mapillary::filterMapillaryLayer - projects", this.privatelayerStyle);
                }), lang.hitch(this, function (e) {
                    //console.error("Mapillary::filterMapillaryLayer", e, validFilters, this.privatelayerStyle);
                    new Message({
                        type: 'error',
                        message: e.message
                    });
                }));
                this.organizationLayerStyle && this.organizationCoverageLayers.setStyle(this.organizationLayerStyle).then(lang.hitch(this, function () {
                    //console.log("Mapillary::filterMapillaryLayer - organizations", this.organizationLayerStyle);
                }), lang.hitch(this, function (e) {
                    console.error("Mapillary::filterMapillaryLayer", e, validFilters, this.organizationLayerStyle);
                }));
                this.publicCoverageLayers && this.map.removeLayer(this.publicCoverageLayers);
                this.publicCoverageLayers && this.map.addLayer(this.publicCoverageLayers);
            //  }), function(e) {
            //      new Message({
            //          type: 'error',
            //          message: e.message
            //      });
            //  });
        },

        /**
         * Show Mapillary Layer
         * @param visible boolean
         * @returns {*}
         */
        showMapillaryLayer: function (visible) {
            var layer = this.publicCoverageLayers;
            if (visible) {
                layer && layer.show();
                //layer && layer.resume();
                //layer.opacity = 1.0
                if (this.coverage && !this.coverage.get('checked'))
                    this.coverage.set('checked', true);
            } else {
                layer && layer.hide();
                //layer && layer.suspend();
                if (this.coverage && this.coverage.get('checked'))
                    this.coverage.set('checked', false);
            }
            return this;
        },

        /**
         * Show Mapillary Organization Layer
         * @param visible
         * @returns {BaseWidget}
         */
        showMapillaryOrganizationLayer: function(visible) {
            var layer = this.organizationCoverageLayers;
            if (!layer)
                return this;
            if (visible) {
                layer.show();
                if (this.organizationCheckbox && !this.organizationCheckbox.get('checked'))
                    this.organizationCheckbox.set('checked', true);
            } else {
                layer.hide();
                if (this.organizationCheckbox && this.organizationCheckbox.get('checked'))
                    this.organizationCheckbox.set('checked', false);
            }
            return this;
        },

        /**
         * Show Mapillary Private Layer
         * @param visible boolean
         * @returns {*}
         */
        showMapillaryPrivatelayer: function (visible) {
            var layer = this.privateCoverageLayers;
            if (!layer)
                return this;
            if (visible) {
                layer.show();
                if (this.privateCheckbox && !this.privateCheckbox.get('checked'))
                    this.privateCheckbox.set('checked', true);
            } else {
                layer.hide();
                if (this.privateCheckbox && this.privateCheckbox.get('checked'))
                    this.privateCheckbox.set('checked', false);
            }
            return this;
        },

        /**
         * Show Mapillary Traffic Signs Layer
         * Waits for the MapillaryViewer to be ready, then enables the Traffic Signs layer
         * @param visible boolean
         */
        showMapillaryTrafficSignsLayer: function (visible) {
            if (this.mapillaryObjects) {
                if (visible) {
                    this.mapillaryObjects.show();
                    if (this.trafficSigns && !this.trafficSigns.get('checked'))
                        this.trafficSigns.set('checked', true);
                } else {
                    this.mapillaryObjects.hide();
                    if (this.trafficSigns && this.trafficSigns.get('checked'))
                        this.trafficSigns.set('checked', false);
                }
            }
        },

        /**
         * Widget Ready
         * @param id
         */
        widgetReady: function (id) {
            if (!this._readyWidgets)
                this._readyWidgets = {};
            if (!this._readyWidgets[id]) {
                this._readyWidgets[id] = new Deferred();

                var widgetManagerEvent,
                    widget = this.widgetManager.getWidgetsByName(id);
                if (widget && widget.length)
                    this._readyWidgets[id].resolve(widget[0]);
                else {
                    widgetManagerEvent = on(this.widgetManager, 'widget-created', lang.hitch(this, function (widget) {
                        if (widget && widget.name === id) {
                            widgetManagerEvent.remove();
                            this._readyWidgets[id].resolve(widget);
                        }
                    }));
                }
            }
            return this._readyWidgets[id].promise;
        },

        /**
         * Set Form From LayerInfos
         * @private
         */
        _setFormFromLayerInfos: function () {
            this.layerInfos._finalLayerInfos.forEach(lang.hitch(this, function (layerInfo) {
                if (layerInfo.id === 'Mapillary_Traffic_Signs') {
                    if (layerInfo._visible)
                        this.form.set('value', {
                            trafficSigns: ['on']
                        });
                    else
                        this.form.set('value', {
                            trafficSigns: null
                        });
                } else if (layerInfo.id === 'Mapillary') {
                    if (layerInfo._visible)
                        this.form.set('value', {
                            coverage: ['on']
                        });
                    else
                        this.form.set('value', {
                            coverage: null
                        });
                }
            }));
        },

        /**
         * Init Traffic Sign Links
         * @private
         */
        _initTrafficSignLinks: function () {
            domQuery('a', this.trafficSignsLinksNode).forEach(lang.hitch(this, function (link) {
                on(link, 'click', lang.hitch(this, function (e) {
                    e.stopPropagation();
                    e.preventDefault();
                    var linkObj = ioQuery.queryToObject(e.target.href.substring(e.target.href.indexOf('?') + 1)),
                        stateObj = lang.mixin({
                            lat: null,
                            lng: null,
                            z: 15
                        }, linkObj);
                    if (stateObj.lat && stateObj.lng) {
                        this.map.centerAndZoom(new Point(stateObj.lng, stateObj.lat), parseInt(stateObj.z) || this.map.getZoom());
                        if (stateObj.trafficSigns === true || stateObj.trafficSigns === 'true')
                            this.showMapillaryTrafficSignsLayer(true);
                        else
                            this.showMapillaryTrafficSignsLayer(false);
                    } else
                        console.error('Must provide lat & lng!');
                }));
            }));
        },

        /**
         * Throw Resize Event
         * @private
         */
        _resizeEvent: function () {
            setTimeout(lang.hitch(this, function () {
                var event;
                this.resize(); //in-case below fails
                //ie 11
                if (document.createEvent) {
                    event = document.createEvent('Event');
                    event.initEvent('resize', true, true);
                } else
                    event = new Event('resize');

                window.global.dispatchEvent(event);
            }), 0);
        },

        /**
         * Check Latest Widget Version
         * Shows update notice in the event that a newer version of the widget has been released.
         * @private
         */
        _checkLatestWidgetVersion: function () {
            return mapillaryUtils.getWidgetVersions().then(lang.hitch(this, function (ver) {
                if (!this.wab2) {
                    ver = ver.esri_widget_1;
                } else {
                    ver = ver.esri_widget_2;
                }
                var def = new Deferred();
                if (mapillaryUtils.compareSemVer(this.version, ver.supported.version) < 0) {
                    html.set(this.updateTextNode, lang.replace(this.nls.updateCriticalWidget, {
                        update_url: mapillaryUtils.updateUrl +  ver.latest.marketplaceId
                    }));
                    domStyle.set(this.updateNode, {
                        'background': '#ea1c26',
                        'display': ''
                    });
                } else if (mapillaryUtils.compareSemVer(this.version, ver.latest.version) < 0) {
                    html.set(this.updateTextNode, lang.replace(this.nls.updateWidget, {
                        update_url: mapillaryUtils.updateUrl +  ver.latest.marketplaceId
                    }));
                    domStyle.set(this.updateNode, {
                        'background': '#fd7f28',
                        'display': ''
                    });
                } else if (mapillaryUtils.compareSemVer(this.version, ver.latest.version) > 0) {
                    html.set(this.updateTextNode, this.nls.developerVersion);
                    domStyle.set(this.updateNode, {
                        'background': '#ff042c',
                        'style': 'color:#fff',
                        'display': ''
                    });
                } else {
                    // up to date!
                }
                def.resolve();
                return def.promise;
            }));
        },

        _setOrganization: function() {

        },

        /**
         * Create User Organizations Menu
         * @private
         */
        _createUserOrganizationsMenu: function () {
            var def = new Deferred();
            mapillaryUtils.getCurrentUser().then(lang.hitch(this, function (user) {
                this.orgId.store.idProperty = 'key';
                var organizations = [].concat(user.organizations || []);
                if (organizations.length)
                    organizations.unshift({
                        key: "public",
                        name: ""
                    });
                this.orgId.store.setData(organizations);
                domConstruct.empty(this.loggedInMenu);

                var userNode = domConstruct.create('div', {
                    className: 'user-menu-item'
                }, this.loggedInMenu);
                var avatarNode = domConstruct.create('div', {
                    className: 'user-menu-item-avatar'
                }, userNode);
                domConstruct.create('img', {
                    src: user.avatar + '?client_id=' + mapillaryUtils.getClientId()
                }, avatarNode);
                var labelNode = domConstruct.create('div', {
                    className: 'user-menu-item-label',
                    innerHTML: user.username
                }, userNode);
                var subLabelNode = domConstruct.create('div', {
                    className: 'user-menu-item-label-sub',
                    innerHTML: 'Individual Account'
                }, userNode);
                this.own(on(userNode, 'click', function(e) {
                    e.stopPropagation();
                    e.preventDefault();
                    this.orgId.set('value', 'public');
                    this._setUser(user.username, user.avatar);
                    domAttr.set(this.loggedInUsernameNode, 'href', 'https://www.mapillary.com/app/user/' + user.username);
                    domStyle.set(this.loggedInMenu, 'display', 'none');
                }.bind(this)));

                if (user.organizations.length > 0) {
                    user.organizations.forEach(lang.hitch(this, function(org) {
                        var orgNode = domConstruct.create('div', {
                            className: 'user-menu-item'
                        }, this.loggedInMenu);
                        var avatarNode = domConstruct.create('div', {
                            className: 'user-menu-item-avatar'
                        }, orgNode);
                        domConstruct.create('img', {
                            src: org.avatar + '?client_id=' + mapillaryUtils.getClientId()
                        }, avatarNode);
                        var labelNode = domConstruct.create('div', {
                            className: 'user-menu-item-label',
                            innerHTML: org.nice_name
                        }, orgNode);
                        var subLabelNode = domConstruct.create('div', {
                            className: 'user-menu-item-label-sub',
                            innerHTML: 'Organization'
                        }, orgNode);
                        this.own(on(orgNode, 'click', function(e) {
                            e.stopPropagation();
                            e.preventDefault();
                            this.orgId.set('value', org.key);
                            this._setUser(org.nice_name, org.avatar);
                            domStyle.set(this.loggedInMenu, 'display', 'none');
                        }.bind(this)));
                    }));
                    //domStyle.set(this.organizationsFilterNode, 'display', '');
                }

                if (!this.config.hideAuthentication) {
                    var logoutNode = domConstruct.create('div', {
                            className: 'user-menu-item logout'
                        }, this.loggedInMenu),
                        logoutLabelNode = domConstruct.create('div', {
                            className: 'user-menu-item-label',
                            innerHTML: 'Sign out'
                        }, logoutNode),
                        logoutAvatarNode = domConstruct.create('span', {
                            className: 'esri-icon esri-icon-sign-out'
                        }, logoutLabelNode, 'first');
                    this.own(on(logoutNode, 'click', function (e) {
                        e.stopPropagation();
                        e.preventDefault();
                        this.deauthenticate();
                    }.bind(this)));
                }

                domStyle.set(this.loggedInNode, 'display', '');
                domStyle.set(this.loggedOutNode, 'display', 'none');

                def.resolve(user.organizations);
            }));
            return def.promise;
        },

        /**
         * Create Mapillary Viewer
         */
        _createMapillaryViewer: function (options) {
            if (this.mapillary)
                return;
            options.component = options.component || {};
            options.component.direction = this.config.mapillaryDirection ? {
                distinguishSequence: true,
                maxWidth: 460,
                minWidth: 180
            } : false;
            options.component.bearing = !!this.config.mapillaryBearing;
            options.component.sequence = !!this.config.mapillarySequence;


            this.mapillary = mapillaryUtils.getViewer('mly', options);
            // Initialize MapillaryObjects Extension
            this.mapillaryObjects = new MapillaryObjects(this.mapillary, this.map, this.config.clientId.split("|")[1], false);
            // Initialize MapillaryMarkers Extension
            this.mapillaryMarkers = new MapillaryMarkers(this.mapillary, this.map);

            //if (this.config.organizationId) {
            //    this.mapillary.setFilter(['==', 'ownerId', this.config.organizationId]);
            //}
            
            this.mapillary.on('bearing', lang.hitch(this, this.onBearingChanged));
            this.mapillary.on('image', lang.hitch(this, this._onNodeChanged));
            this.mapillary.accessToken = this.config.clientId;
            this.mapillaryMarkers.init();
            this.widgetReady('Edit').then(lang.hitch(this, function (editWidget) {
                this.editWidget = editWidget;
                this._initEditorEvents();
            }));

            // Hide Mapillary viewer
            this.parentEl = this.mapillary._container._domContainer.parentElement;
            this.toggleViewerVisibility(true);
            //this.mapillary.activateComponent("spatial");
        },

        /**
         * Destroy Mapillary Viewer
         * @private
         */
        _destroyMapillaryViewer: function () {
            if (!this.mapillary)
                return;
            this.mapillary.off('bearing', lang.hitch(this, this.onBearingChanged));
            this.mapillary.off('image', lang.hitch(this, this._onNodeChanged));
            mapillaryUtils.destroyViewer('mly');
            this.mapillary = null;
            this.mapillaryObjects = null;
            this.mapillaryMarkers.destroy();
            this.mapillaryMarkers = null;
            //domConstruct.empty('mly');
        },

        /**
         * Add Mapillary Coverage Layer to Map
         */
        _addMapillaryCoverageLayerToMap: function () {
            this.publicCoverageLayers = mapillaryUtils.createMapillaryCoverageLayer();
            this.map.addLayer(this.publicCoverageLayers, 1);
 
            // Setup overzoom so layer displays at all zoom levels
            var lyr = this.map.getLayer("Mapillary");
            lyr.setScaleRange(0, 15);      
        },

        distance: function(lat1, lon1, lat2, lon2, unit) {
            var radlat1 = Math.PI * lat1/180
            var radlat2 = Math.PI * lat2/180
            var theta = lon1-lon2
            var radtheta = Math.PI * theta/180
            var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
            if (dist > 1) {
              dist = 1;
            }
            dist = Math.acos(dist)
            dist = dist * 180/Math.PI
            dist = dist * 60 * 1.1515
            if (unit=="K") { dist = dist * 1.609344 }
            if (unit=="N") { dist = dist * 0.8684 }
            return dist
          },

        /**
         * Remove Mapillary Click Event From Map
         */
        _removeMapillaryClickEventFromMap: function () {
            this.mapClickEvent && this.mapClickEvent.remove();
        },

        /**
         * Add Mapillary Click Event to Map
         */
        _addMapillaryClickEventToMap: function () {
            this._removeMapillaryClickEventFromMap();
            // Bind event to map click
            return this.mapClickEvent = this.map.on('click', lang.hitch(this, function (event) {
                if (event.which !== 1) //ignore middle/right click
                    return;
                //console.log('Mapillary::mapClick', event);

                if (!this.config.clientId || this.config.clientId === '') {
                    new Message({
                        type: 'error',
                        message: 'Client Token Required'
                    });
                    return;
                }
                //point = event.mapPoint;
                //if (webMercatorUtils.canProject(point, new SpatialReference(4326))) {
                //    point = webMercatorUtils.project(point, new SpatialReference(4326));
                //}
                //var tilex = mapillaryUtils.lon2tile(point.x, 14);
                //var tiley = mapillaryUtils.lat2tile(point.y, 14);
                //this.mapillary.moveTo("2873697312943603");
                //                this.toggleViewerVisibility(true);
                var filter = this.getFormValues(),
                    editToolbar = this.editWidget && this.editWidget.editor && this.editWidget.editor.editToolbar,
                    currentState = editToolbar && editToolbar.getCurrentState(),
                    currentTool = currentState && currentState.tool,
                    eventTimeout = currentTool === 0 ? 350 : 0, // on add (0) tool, delay slightly
                    currentGraphic = (currentState && currentState.graphic) || event.graphic,
                    point,
                    outSR = new SpatialReference(4326),
                    projectParams = new ProjectParameters(),
                    projectDef = new Deferred();

                // this.coverageDef.then(lang.hitch(this, function () {
                    currentState = editToolbar && editToolbar.getCurrentState();
                    currentTool = currentState && currentState.tool;
                    currentGraphic = (currentState && currentState.graphic) || event.graphic;
                    if (currentTool) {

                    } else if (!currentGraphic || currentGraphic._layer.id === 'Mapillary_Coverage_Zoom') {
                        this.loading.show();
                        point = event.mapPoint;
                        // client-side projection
                        if (webMercatorUtils.canProject(point, outSR)) {
                            point = webMercatorUtils.project(point, outSR);
                        }
                        // server-side projection
                        if (!point.spatialReference.equals(outSR)) {
                            projectParams.geometries = [point];
                            projectParams.outSR = outSR;
                            esriConfig.defaults.geometryService.project(projectParams, function (geometries) {
                                projectDef.resolve(geometries[0]);
                            }, projectDef.reject);
                        } else {
                            projectDef.resolve(point);
                        }
                        projectDef.then(lang.hitch(this, function (point) {
                            this.tilex = mapillaryUtils.lon2tile(point.x, 14);
                            this.tiley = mapillaryUtils.lat2tile(point.y, 14);
                            return mapillaryUtils.getImage(14, this.tiley, this.tilex)
                        })).then(lang.hitch(this, function (res) {
                            var binaryReader = new FileReader();
                            binaryReader.readAsArrayBuffer(res);                    
                            var that = this;
                            binaryReader.onloadend = function () {
                                var arrayView = new Uint8Array(binaryReader.result);
                                var buffer = new Protobuf(arrayView);
                                var tile = new VectorTile(buffer);
                                var features = [];
                                var sequence_ids = []
                                var feature = tile.layers.image.feature(0);
                                feature.loadGeometry();
                                for (var i = 0; i < tile.layers.image.length; i++) {
                                    var feature = tile.layers.image.feature(i);
                                    feature.loadGeometry();
                                    feat = feature.toGeoJSON(that.tilex, that.tiley, 14);
                                    var x = feat.geometry.coordinates[0];
                                    var y = feat.geometry.coordinates[1];
                                    var dist = that.distance(point.x, point.y, x, y, "K")

                                    if (that.config.organizationId){
                                        if (parseInt(that.config.organizationId) === feat.properties.organization_id) {                                  
                                            features.push({"dist": dist, "id": feat.properties.id})  
                                            sequence_ids.push(feat.properties.sequence_id)                                  
                                        }
                                    } else {
                                        if (validFilters.fromDate && validFilters.toDate) {
                                            if (feat.properties.captured_at >= validFilters.fromDate.getTime() || feat.properties.captured_at <= validFilters.toDate.getTime()) {
                                                features.push({"dist": dist, "id": feat.properties.id})
                                                sequence_ids.push(feat.properties.sequence_id)
                                            }
                                        }
                                        else if (validFilters.fromDate) {
                                            if (feat.properties.captured_at >= validFilters.fromDate.getTime()) {
                                                features.push({"dist": dist, "id": feat.properties.id})
                                                sequence_ids.push(feat.properties.sequence_id)
                                            }
                                        } else if (validFilters.toDate) {
                                            if (feat.properties.captured_at <= validFilters.toDate.getTime()) {
                                                features.push({"dist": dist, "id": feat.properties.id})
                                                sequence_ids.push(feat.properties.sequence_id)
                                            }                 
                                           
                                        } else {
                                            features.push({"dist": dist, "id": feat.properties.id})
                                        }                                                                                                                    
                                }
                                }
                                features.sort(function (a, b) {
                                    return a.dist - b.dist
                                })
                                if (that.config.organizationId){
                                    that.mapillary.setFilter(['in', 'sequenceId', ...new Set(sequence_ids)])
                                }
                                if (features.length !== 0) {
                                    that.mapillary.moveTo(String(features[0].id));
                                    that.toggleViewerVisibility(true);
                                }
                                
                                that.loading.hide();
                                
                            }


                            //} else {
                            //    console.error('No images found.')
                            //}
                           
                        }), lang.hitch(this, function (error) {
                            if (error) {
                                new Message({
                                    type: 'error',
                                    message: error.message || error.error
                                });
                                console.error(error);
                            }
                            this.loading.hide();
                        }));
                     }// else {
                    //     this.loading.show();
                    //     switch (currentGraphic.geometry.type) {
                    //         case 'polygon':
                    //         case 'multipoint':
                    //         case 'polyline':
                    //         case 'extent':
                    //             point = event.mapPoint;
                    //             break;
                    //         default:
                    //         case 'point':
                    //             point = currentGraphic && currentGraphic.geometry;
                    //             break;
                    //     }
                    //     // client-side projection
                    //     if (webMercatorUtils.canProject(point, outSR)) {
                    //         point = webMercatorUtils.project(point, outSR);
                    //     }
                    //     // server-side projection
                    //     if (!point.spatialReference.equals(outSR)) {
                    //         projectParams.geometries = [point];
                    //         projectParams.outSR = outSR;
                    //         esriConfig.defaults.geometryService.project(projectParams, function (geometries) {
                    //             projectDef.resolve(geometries[0]);
                    //         }, projectDef.reject);
                    //     } else {
                    //         projectDef.resolve(point);
                    //     }
                    //     projectDef.then(lang.hitch(this, function (point) {
                    //         return mapillaryUtils.imageSearch(lang.mixin({
                    //             closeto: point.x.toFixed(10) + ',' + point.y.toFixed(10),
                    //             lookat: point.x.toFixed(10) + ',' + point.y.toFixed(10),
                    //             radius: 2000,
                    //             max: 20
                    //         }, filter));
                    //     }))
                    //     .then(lang.hitch(this, function (res) {
                    //         var i = 0,
                    //             nearestImages = res.features.map(function (image) {
                    //                 return image.properties.key;
                    //             }).filter(function (image) {
                    //                 return ++i <= 10; //return top 10
                    //             });
                    //         /* If not clicking on a graphic, move to nearest */
                    //         if (nearestImages && !currentGraphic) {
                    //             this.toggleViewerVisibility(true);
                    //             return this.mapillary.moveToKey(nearestImages[0]);
                    //             /* Only move if the current image is not one of nearestImages*/
                    //         } else if (nearestImages.length && nearestImages.indexOf(this.mapillary._navigator.keyRequested$ && this.mapillary._navigator.keyRequested$._value) === -1) {
                    //             // FIXME Sometimes the closest image is too close
                    //             this.toggleViewerVisibility(true);
                    //             return this.mapillary.moveToKey(nearestImages[0]);
                    //         } else {
                    //             var def = new Deferred();
                    //             def.resolve();
                    //             return def.promise;
                    //         }
                    //     }))
                    //     .then(lang.hitch(this, function () {
                    //         this.loading.hide();
                    //     }), lang.hitch(this, function (error) {
                    //         new Message({
                    //             type: 'error',
                    //             message: 'We couldn\'t load the data from the map, zoom in to the area that interests you an try clicking again.'
                    //         });
                    //         console.error(error);
                    //         this.loading.hide();
                    //     }));
                    // }
                // }), lang.hitch(this, function(error) {
                //     new Message({
                //         type: 'error',
                //         message: 'We couldn\'t load the data from the map, zoom in to the area that interests you an try clicking again.'
                //     });
                //     console.error(error);
                //     this.loading.hide();
                // }));
            }));
        },

        /**
         * Add Mapillary LayerInfosIsVisible Event to Map
         * This event allows for the MapillaryFilter widget to update its Traffic Signs checkbox when the layer is made visible via the LayerList
         * @returns Deferred.promise
         */
        _addMapillaryLayerInfoIsVisibleEventToMap: function () {
            var def = new Deferred();
            LayerInfos.getInstance(this.map, this.map.itemInfo).then(lang.hitch(this, function (operLayerInfos) {
                if (addMapillaryLayerInfoIsVisibleEvent)
                    addMapillaryLayerInfoIsVisibleEvent.remove();
                addMapillaryLayerInfoIsVisibleEvent = operLayerInfos.on('layerInfosIsVisibleChanged', lang.hitch(this, function (changedLayerInfo) {
                    changedLayerInfo.forEach(lang.hitch(this, function (layerInfo) {
                        if (layerInfo.id === 'Mapillary') {
                            //console.log('Mapillary::_addMapillaryLayerInfoIsVisibleEventToMap', layerInfo.layerObject.visible);
                            this.showMapillaryLayer(layerInfo.layerObject.visible);
                        } else if (layerInfo.id === 'Mapillary_Private') {
                            this.showMapillaryPrivatelayer(layerInfo.layerObject.visible);
                        } else if (layerInfo.id === 'Mapillary_Organization') {
                            this.showMapillaryOrganizationLayer(layerInfo.layerObject.visible);
                        } else if (layerInfo.id === 'Mapillary_Traffic_Signs') {
                            //console.log('Mapillary::_addMapillaryLayerInfoIsVisibleEventToMap', layerInfo.layerObject.visible);
                            this.showMapillaryTrafficSignsLayer(layerInfo.layerObject.visible);
                        }
                    }));
                }));
                def.resolve(operLayerInfos);
            }));
            return def.promise;
        },

        /**
         * Reset Filter
         * @private
         */
        _resetFilter: function (e) {

            this.loading.hide();
            e && typeof e.stopPropagation === 'function' && e.stopPropagation();
            e && typeof e.preventDefault === 'function' && e.preventDefault();
            this.coverage.set('checked', true);
            this.useTransitions.set('checked', this.config.useTransitions);
            //this.privateCheckbox.set('checked', false);
            //this.organizationCheckbox.set('checked', false);
            //this.orgId.set('value', (this.wab2 && this.config.defaultOrganization && this.config.defaultOrganization !== '') ? this.config.defaultOrganization : 'public');
            //this._setDefaultUsernames();
            //this.userSearch.reset();
            
            this.fromDate.reset();
            
            this.toDate.reset();
           
            this._graphicsLayer && this._graphicsLayer.clear();
            this.toggleViewerVisibility(false);

            
        },

        /**
         * On Filter Change
         * @param e
         * @private
         */
        _onFilterChange: function (e) {
            e && typeof e.stopPropagation === 'function' && e.stopPropagation();
            e && typeof e.preventDefault === 'function' && e.preventDefault();
            var values = this.getFormValues();
            //console.log('Mapillary::_onFilterChange', values);
            this.emit('mapillaryFilter', values);
            topic.publish('MapillaryFilter', values);
        },

        /**
         * On Transitions Change
         * @param e
         * @private
         */
        _onTransitionsChange: function (e) {
            this.mapillary.setTransitionMode(this.useTransitions.get('checked') ? mapillaryUtils.Mapillary.TransitionMode.Default : mapillaryUtils.Mapillary.TransitionMode.Instantaneous);
        },

        /**
         * On Coverage Change
         * @param e
         * @private
         */
        _onCoverageCheckboxChange: function (e) {
            var visible = this.coverage.get('checked')
            currentlyVisible = this.publicCoverageLayers && this.publicCoverageLayers.visible;
            this.showMapillaryLayer(visible);
            //if (!visible) {
             //   this.filterMapillaryLayer(this.getFormValues());
            //}
        },

        /**
         * On Organization Change
         * @param e
         * @private
         */
        _onOrganizationCheckboxChange: function (e) {
            var visible = this.organizationCheckbox.get('checked'),
                currentlyVisible = this.organizationCoverageLayers && this.organizationCoverageLayers.visible;
            this.showMapillaryOrganizationLayer(visible);
            this.filterMapillaryLayer(this.getFormValues());
        },
        /**
         * On Organization Change
         * @param e
         * @private
         */
        _onPrivateCheckboxChange: function (e) {
            var visible = this.privateCheckbox.get('checked'),
                currentlyVisible = this.privateCoverageLayers && this.privateCoverageLayers.visible;
            this.showMapillaryPrivatelayer(visible);
            this.filterMapillaryLayer(this.getFormValues());
        },

        /**
         * On Traffic Signs Change
         * @param e
         * @private
         */
        _onTrafficSignsChange: function (e) {
            this.showMapillaryTrafficSignsLayer(this.trafficSigns.get('checked'));
        },

        /**
         * On Organization Change
         * @param val value
         * @private
         */
        _onOrganizationChange: function (val) {
            if (val && val !== 'public')
                this.loading.show();
            if (this.privateCoverageLayers) {
                this.map.removeLayer(this.privateCoverageLayers);
                this.map.removeLayer(this.organizationCoverageLayers);
                this.privateCoverageLayers = null;
                this.organizationCoverageLayers = null;
            }
            if (val && val !== '' && val !== 'public') {
                this.orgId.item = this.orgId.item || this.orgId.store.get(this.orgId.get('value'));
                this.organizationCoverageLayers = mapillaryUtils.createMapillaryOrganizationCoverageLayer(this.orgId.item ? this.orgId.store.getValue(this.orgId.item, 'key') : 'none');
                this.map.addLayer(this.organizationCoverageLayers, 2);
                this.showMapillaryOrganizationLayer(false);
                domStyle.set(this.organizationCheckboxNode, 'display', 'none');

                this.privateCoverageLayers = mapillaryUtils.createMapillaryPrivateCoverageLayer(this.orgId.item ? this.orgId.store.getValue(this.orgId.item, 'key') : 'none');
                this.map.addLayer(this.privateCoverageLayers, 3);
                this.showMapillaryPrivatelayer(false);
                domStyle.set(this.privateCheckboxNode, 'display', 'none');

                //this.showMapillaryLayer(false);

                this.resize();

                this.privateCheckboxLabel.innerHTML = this.orgId.store.getValue(this.orgId.item, 'nice_name');
                this.organizationCheckboxLabel.innerHTML = this.orgId.store.getValue(this.orgId.item, 'nice_name');

                async.series([
                    lang.hitch(this, function(cb) {
                        mapillaryUtils.imageSearch({orgId: this.orgId.item.key, private: false, max: 50}).then(function(res) {
                            cb(null, res);
                        }, function(err) {
                            cb(err);
                        });
                    }),
                    lang.hitch(this, function (cb) {
                        mapillaryUtils.imageSearch({orgId: this.orgId.item.key, private: true, max: 50}).then(function(res) {
                            cb(null, res);
                        }, function(err) {
                            cb(err);
                        });
                    })
                ], lang.hitch(this, function(error, res) {
                    var hasOrg = res[0],
                        hasPrivate = res[1],
                        marker = new SimpleMarkerSymbol(
                            SimpleMarkerSymbol.STYLE_CIRCLE,
                            20,
                            new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
                                new Color([255, 255, 255]),
                                3),
                            new Color([255, 134, 27]));
                    this.loading.hide();
                    if (hasOrg && hasOrg.features && hasOrg.features.length) {
                        var graphics = hasOrg.features.map(function (feature) {
                            return new Graphic(new Point([feature.geometry.coordinates[0], feature.geometry.coordinates[1]]), marker);
                        });
                        this._orgExtent = graphicsUtils.graphicsExtent(graphics);
                    }
                    if (hasPrivate && hasPrivate.features && hasPrivate.features.length) {
                        var graphics = hasPrivate.features.map(function(feature) {
                            return new Graphic(new Point([feature.geometry.coordinates[0],feature.geometry.coordinates[1]]), marker);
                        });
                        this._privateExtent = graphicsUtils.graphicsExtent(graphics);
                    }
                    if (error) {
                        if (error && error.message && error.message.match(/Unable to load/)) {
                            new Message({
                                type: 'error',
                                message: 'Your Mapillary session has expired. Please sign in.'
                            });
                        } else if (error.message || error.error)
                            new Message({
                                type: 'error',
                                message: error.message || error.error
                            });
                    } else {
                        hasOrg = !!hasOrg.features.length;
                        hasPrivate = this.orgId.item.private_repository && !!hasPrivate.features.length;
                        if (hasPrivate) {
                            if (hasOrg)
                                domStyle.set(this.organizationCheckboxNode, 'display', '');
                            domStyle.set(this.privateCheckboxNode, 'display', '');
                            this.showMapillaryLayer(false);
                            this.showMapillaryOrganizationLayer(hasOrg);
                            this.showMapillaryPrivatelayer(true);
                        } else if (hasOrg) {
                            domStyle.set(this.organizationCheckboxNode, 'display', '');
                            domStyle.set(this.privateCheckboxNode, 'display', 'none');
                            this.showMapillaryLayer(false);
                            this.showMapillaryOrganizationLayer(true);
                            this.showMapillaryPrivatelayer(false);
                        } else {
                            domStyle.set(this.organizationCheckboxNode, 'display', 'none');
                            domStyle.set(this.privateCheckboxNode, 'display', 'none');
                            this.showMapillaryLayer(true);
                            this.showMapillaryOrganizationLayer(false);
                            this.showMapillaryPrivatelayer(false);
                        }
                        this.resize();
                    }
                }));

            } else if (val === 'public') {
                this.showMapillaryLayer(true);
                this.showMapillaryOrganizationLayer(false);
                this.showMapillaryPrivatelayer(false);
                if (this.currentUser)
                    this._setUser(this.currentUser.username, this.currentUser.avatar);
                domStyle.set(this.privateCheckboxNode, 'display', 'none');
                domStyle.set(this.organizationCheckboxNode, 'display', 'none');
            }
            this._onFilterChange();
            this.resize();
        },

        /**
         * On Username Change
         * @param e
         * @private
         */
        _onUsernameChange: function (e) {
            var _user;
            this.userSearch.store.idProperty = 'key';
            this.userSearch.store.data.forEach(lang.hitch(this, function (user) {
                if (user.username === this.userSearch.get('value'))
                    _user = user;
            }));
            if (_user)
                this.userList.addValue(_user);
            this.userSearch.store.setData([]);
            this.userSearch.set('value', '');
        },

        /**
         * On Username Keyup
         * @param e
         * @private
         */
        _onUsernameKeyup: function (e) {
            var value = this.userSearch.get('displayedValue');
            mapillaryUtils.userFuzzySearch(value).then(lang.hitch(this, function (users) {
                users = users.filter(function (user) {
                    return !!user;
                });
                users.sort(function(a, b) {
                    if(a.username > b.username) {
                        return 1;
                    } else if (a.username < b.username) {
                        return -1;
                    }
                    return 0;
                });
                this.userSearch.set('store', new Memory({
                        data: users
                    })
                );
                if (users.length > 0) {
                    this.userSearch._popupStateNode = this.userSearchListNode;
                    this.userSearch.loadAndOpenDropDown();
                } else
                    this.userSearch.closeDropDown(true);
            }));
        },

        /**
         * On Username List Change
         * @private
         */
        _onUsernameListChange: function(e) {
            this._onFilterChange(e);
            this.resize();
        },

        /**
         * On Bearing Change
         * @param num
         */
        onBearingChanged: function (num) {
            this.directionSymbol.setAngle(num.bearing);
            this._graphicsLayer && this._graphicsLayer.refresh();
        },

        /**
         * On Mapillary Node Change
         * @param node
         */
        _onNodeChanged: function (node) {
            //console.log("ON NODE CHANGE ", + node)
            if (!node) {
                this.toggleViewerVisibility(false);
                return;
            } //else
                //domStyle.set(this.downloadImage, 'display', '');

            //if (this.node && (node.key === this.node.key))
            //    return;

            this.node = node;
            if (node.image.height > node.image.width) {
                this.mapillary.setRenderMode(mapillaryUtils.Mapillary.RenderMode.Letterbox);
            } else {
                this.mapillary.setRenderMode(mapillaryUtils.Mapillary.RenderMode.Fill);
            }

            this.timestampNode.innerHTML = locale.format(new Date(node.image.capturedAt), {
                selector: 'date',
                datePattern: 'MMM d, y, HH:mm:ss'
            });

            //TODO: FIX THIS URL
            //this.downloadImage.href = 'https://images.mapillary.com/' + node.key + '/thumb-2048.jpg';

            if (!this._graphicsLayer) {
                this._graphicsLayer = new GraphicsLayer();
                this.map.addLayer(this._graphicsLayer);
                this._graphicsLayer.show();
            }
            this._graphicsLayer.clear();
            this.toggleViewerVisibility(true);
            this.mapillary.resize();
            var lon = this.node.image.originalLngLat.lng.toFixed(6),
                lat = this.node.image.originalLngLat.lat.toFixed(6),
                pt = new Point(lon, lat, new SpatialReference({'wkid': 4326}));

            this.directionSymbol = new PictureMarkerSymbol(this.folderUrl + 'images/icon-direction.png', 26, 52);
            this.directionSymbol.setAngle(node.image.originalCompassAngle);

            var marker = new SimpleMarkerSymbol(
                SimpleMarkerSymbol.STYLE_CIRCLE,
                20,
                new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
                    new Color([255, 255, 255]),
                    3),
                new Color([255, 134, 27]));


            this._graphicsLayer.add(new Graphic(
                webMercatorUtils.geographicToWebMercator(pt),
                marker,
                {'title': lon + ' ' + lat, 'content': 'A Mapillary Node'},
                new InfoTemplate('${title}', '${content}')
            ));

            this._graphicsLayer.add(new Graphic(
                webMercatorUtils.geographicToWebMercator(pt),
                this.directionSymbol
            ));

            this._centerMapAtNode();
            topic.publish('mapillaryNodeChange', node);
        },

        /**
         * Center Map at Node
         * @private
         */
        _centerMapAtNode: function() {
            if (!this.node)
                return;
            var lon = this.node.image.originalLngLat.lng.toFixed(6),
                lat = this.node.image.originalLngLat.lat.toFixed(6),
                pt = new Point(lon, lat, new SpatialReference({'wkid': 4326}));
            this.map.centerAt(pt);
        },

        /**
         * Init Events
         * @private
         */
        _initEvents: function () {
            this._events.push(on(this.maximizeNode, 'click', this.maximize.bind(this)));

            this.own(on(window.global, 'resize', lang.hitch(this, function () {
                this.resize();
            })));

            this.own(on(this.signInButton, 'click', lang.hitch(this, function (e) {
                e.stopPropagation();
                e.preventDefault();
                return this.authenticate(true);
            })));
            this.own(on(this.loggedInNode, 'click', lang.hitch(this, function (e) {
                e.stopPropagation();
                e.preventDefault();
                if (domStyle.get(this.loggedInMenu, 'display') !== 'none')
                    domStyle.set(this.loggedInMenu, 'display', 'none');
                else
                    domStyle.set(this.loggedInMenu, 'display', '');
            })));

            this.own(on(this.organizationZoomIconNode, 'click', lang.hitch(this, function(e) {
                e.stopPropagation();
                e.preventDefault();
                if (this._orgExtent) {
                    this.map.setExtent(this._orgExtent);
                }
            })));
            this.own(on(this.privateZoomIconNode, 'click', lang.hitch(this, function(e) {
                e.stopPropagation();
                e.preventDefault();
                if (this._privateExtent) {
                    this.map.setExtent(this._privateExtent);
                }
            })));

            this.own(on(this.collapseToggleNode, 'click', lang.hitch(this, function (e) {
                e.stopPropagation();
                e.preventDefault();
                if (this.panel && this.panel.domNode) {
                    domClass.toggle(this.panel.domNode, 'mapillary-collapse-open');
                    if (domClass.contains(this.panel.domNode, 'mapillary-collapse-open')) {
                        var height = this.domNode.clientHeight - this.collapseToggleNode.clientHeight;
                        domStyle.set(this.collapseWrapperNode, 'height', height + 'px');
                        domStyle.set(this.collapseToggleNode, 'bottom', height + 'px');
                    } else {
                        domStyle.set(this.collapseWrapperNode, 'height', '');
                        domStyle.set(this.collapseToggleNode, 'bottom', '');
                    }
                }
            })));

            // set searchAttr and validator on users
            this.userSearch.set({
                validator: function () {
                    return true;
                },
                searchAttr: 'username'
            });

            /*
             * Mapillary Viewer Editing
             */
            this.own(topic.subscribe('MapillaryViewerEdit', lang.hitch(this, this._onMapillaryViewerEdit)));
            this.own(topic.subscribe('MapillaryViewerAdd', lang.hitch(this, this._onMapillaryViewerAdd)));
            this.own(topic.subscribe('MapillaryViewerSelect', lang.hitch(this, this._onMapillaryViewerSelect)));

            /*
             * Mapillary Filters
             */
            this.own(topic.subscribe('MapillaryFilter', lang.hitch(this, this.filterMapillaryLayer)));
            //this.own(this.orgId.on('change', lang.hitch(this, this._onOrganizationChange)));
            this.own(this.fromDate.on('change', lang.hitch(this, this._onFilterChange)));
            this.own(this.toDate.on('change', lang.hitch(this, this._onFilterChange)));
            //this.own(this.privateCheckbox.on('change', lang.hitch(this, this._onPrivateCheckboxChange)));
            //this.own(this.organizationCheckbox.on('change', lang.hitch(this, this._onOrganizationCheckboxChange)));
            //this.own(this.userList.on('remove', lang.hitch(this, this._onUsernameListChange)));
            //this.own(this.userList.on('add', lang.hitch(this, this._onUsernameListChange)));
            this.own(this.useTransitions.on('change', lang.hitch(this, this._onTransitionsChange)));
            //this.own(this.userSearch.on('keyup', lang.hitch(this, debounce(this._onUsernameKeyup, 300))));
            //this.own(this.userSearch.on('change', lang.hitch(this, this._onUsernameChange)));
            this.own(this.coverage.on('change', lang.hitch(this, this._onCoverageCheckboxChange)));
            this.own(this.trafficSigns.on('change', lang.hitch(this, this._onTrafficSignsChange)));
            this.own(this.form.on('submit', lang.hitch(this, this._onFilterChange)));
            this.own(this.form.on('reset', lang.hitch(this, this._resetFilter)));
            this.own(on(this.resetButtonNode, 'click', lang.hitch(this, this._resetFilter)));
        },

        /**
         * Init Editor Toolbar Events
         * @private
         */
        _initEditorToolbarEvents: function () {
            var interval = setInterval(lang.hitch(this, function () {
                if (this.editWidget.editor.editToolbar) {
                    clearInterval(interval);
                    this.own(this.editWidget.editor.editToolbar.on('draw-complete', lang.hitch(this, this._onDrawComplete)));
                    this.own(this.editWidget.editor.editToolbar.on('graphic-move', lang.hitch(this, this._onGraphicMove)));
                    this.own(this.editWidget.editor.editToolbar.on('graphic-move-stop', lang.hitch(this, this._onGraphicMoveStop)));
                    this.own(this.editWidget.editor.editToolbar.on('activate', lang.hitch(this, this._onToolbarActivate)));
                    this.own(this.editWidget.editor.editToolbar.on('deactivate', lang.hitch(this, this._onToolbarDeactivate)));
                    this.own(this.editWidget.editor.templatePicker.on('selection-change', lang.hitch(this, this._onTemplateSelectionChange)));
                }
            }), 100);
        },

        /**
         * Init Editor Events
         * @private
         */
        _initEditorEvents: function () {
            if (this.editWidget.state === 'opened')
                topic.publish('MapillaryEditOpen');
            aspect.after(this.editWidget, 'onOpen', lang.hitch(this, function () {
                topic.publish('MapillaryEditOpen');
            }));
            aspect.after(this.editWidget, 'onClose', lang.hitch(this, function () {
                topic.publish('MapillaryEditClose');
            }));
            aspect.after(this.editWidget, 'onActivate', lang.hitch(this, function () {
                topic.publish('MapillaryEditActive');
            }));
            aspect.after(this.editWidget, 'onDeactivate', lang.hitch(this, function () {
                topic.publish('MapillaryEditDeactive');
            }));

            if (this.editWidget._started)
                this._initEditorToolbarEvents();
            else
                aspect.after(this.editWidget, 'startup', lang.hitch(this, function () {
                    //console.log('Edit::startup');
                    this._initEditorToolbarEvents();
                }));
        },

        /**
         * On Template Picker Selection Change
         * @private
         */
        _onTemplateSelectionChange: function (val) {
            topic.publish('MapillaryEditTemplate', val);
        },

        /**
         * On Mapillary Viewer Edit
         * @param marker
         * @private
         */
        _onMapillaryViewerEdit: function (marker) {
            setTimeout(lang.hitch(this, function () {
                var pt = new Point(marker.latLon.lon.toFixed(6), marker.latLon.lat.toFixed(6));
                if (webMercatorUtils.canProject(pt, this.map.spatialReference)) {
                    pt = webMercatorUtils.project(pt, this.map);
                }
                marker._feature.geometry = pt;
                this.editWidget.editor._applyEdits([{
                    layer: marker._layer,
                    updates: [marker._feature]
                }]);
                this.editWidget.editor._clearSelection();
                this.editWidget.editor.editToolbar.refresh();
            }, 0));
        },

        /**
         * On Mapillary Viewer Select
         * @param marker
         * @private
         */
        _onMapillaryViewerSelect: function (marker) {
            //console.log('Mapillary::_onMapillaryViewerSelect', marker, marker._feature);

            //this.editWidget.editor._enableMapClickHandler();
            this.editWidget.editor.editToolbar.activate(EditToolbar.MOVE, marker._feature);
            this.editWidget.editor.editToolbar.refresh();

            var query = new Query();
            query.objectIds = [marker._feature.attributes[marker._layer.objectIdField]];
            marker._layer.selectFeatures(query, esri.layers.FeatureLayer.SELECTION_NEW);
        },

        /**
         * On Mapillary Viewer Add
         * @param graphic
         * @private
         */
        _onMapillaryViewerAdd: function (graphic) {
            if (!graphic) {
                console.error('Mapillary::_onMapillaryViewerAdd - no graphic');
                return;
            }
            var template = this.editWidget && this.editWidget.editor && this.editWidget.editor.templatePicker.getSelected(),
                pt = graphic.geometry;

            if (!template || !pt) {
                return;
            }

            if (webMercatorUtils.canProject(pt, this.map.spatialReference)) {
                pt = webMercatorUtils.project(pt, this.map);
            }
            graphic = new Graphic(pt, null, lang.mixin({}, template.template.prototype.attributes));
            graphic._layer = template.featureLayer;
            setTimeout(lang.hitch(this, function () {
                this.editWidget.editor._applyEdits([{
                    layer: graphic._layer,
                    adds: [graphic]
                }]);
                this.editWidget.editor._clearSelection();
                this.editWidget.editor.editToolbar.refresh();
            }, 0));
        },

        /**
         * On Edit Toolbar Draw Complete
         * @param e
         * @private
         */
        _onDrawComplete: function (e) {

        },

        /**
         * On Edit Toolbar Active
         * @param e
         * @private
         */
        _onToolbarActivate: function (e) {
            topic.publish('MapillaryEditActive', e);
        },

        /**
         * On Edit Toolbar Deactivate
         * @param e
         * @private
         */
        _onToolbarDeactivate: function (e) {
            this.editWidget.editor._clearSelection();
            topic.publish('MapillaryEditDeactive', e);
        },

        /**
         * On Edit Toolbar Graphic Move
         * @param e
         * @private
         */
        _onGraphicMove: function (e) {
            topic.publish('MapillaryEditMove', e);
        },

        /**
         * On Edit Toolbar Graphic Move
         * @param e
         * @private
         */
        _onGraphicMoveStop: function (e) {
            //console.log('Mapillary::_onGraphicMoveStop', e);
            //e && e.graphic && e.graphic._layer && e.graphic._layer.applyEdits(null, [e.graphic], null);
            this.editWidget.editor._applyEdits([{
                layer: e.graphic._layer,
                updates: [e.graphic]
            }]);
            topic.publish('MapillaryEditMoveStop', e);
            this.editWidget.editor._clearSelection();
            this.editWidget.editor.editToolbar.refresh();
        },

        /**
         * This function used for loading indicator
         */
        _initLoading: function () {
            this.loading = new LoadingIndicator({
                hidden: true
            });
            this.loading.placeAt(this.domNode);
            this.loading.startup();
        },

        /**
         * Destroy
         */
        destroy: function () {
            this.node = null;
            this._interval && clearInterval(this._interval);
            this._onNodeChanged(null);
            this._removeMapillaryClickEventFromMap();
            this._destroyMapillaryViewer();

            this.mapillaryObjects && this.mapillaryObjects.destroy();
            this.mapillaryMarkers && this.mapillaryMarkers.destroy();
            this.mapillaryObjects = null;
            this.mapillaryMarkers = null;

            this.publicCoverageLayers && this.map.removeLayer(this.publicCoverageLayers);
            this.privateCoverageLayers && this.map.removeLayer(this.privateCoverageLayers);
            this.organizationCoverageLayers && this.map.removeLayer(this.organizationCoverageLayers);
            this.mapillaryCoverageLayer && this.map.removeLayer(this.mapillaryCoverageLayer);
            this.mapillarySequenceLayer && this.map.removeLayer(this.mapillarySequenceLayer);
            this._graphicsLayer && this.map.removeLayer(this._graphicsLayer);
            this.publicCoverageLayers = null;
            this.mapillaryCoverageLayer = null;
            this.mapillarySequenceLayer = null;
            this._graphicsLayer = null;

            this.inherited(arguments);
        },

        /**
         * On Open
         */
        onOpen: function () {
            //console.log('Mapillary::onOpen');
            var values = this._values || this.getFormValues();
            if (values.coverage)
                this.showMapillaryLayer(true);
            if (values.trafficSigns)
                this.showMapillaryTrafficSignsLayer(true);
            this._graphicsLayer && this._graphicsLayer.show();
            this._onNodeChanged(this.node);
            this._addMapillaryClickEventToMap();
            this._resizeEvent();
        },

        /**
         * On Close
         */
        onClose: function () {
            //console.log('Mapillary::onClose');
            this._values = this.getFormValues();
            mapillaryUtils.cancelRequests();
            if (this.config.clearCoverageClose) {
                this.publicCoverageLayers && this.publicCoverageLayers.hide();
                this.privateCoverageLayers && this.privateCoverageLayers.hide();
                this.organizationCoverageLayers && this.organizationCoverageLayers.hide();
                this.mapillaryCoverageLayer && this.mapillaryCoverageLayer.hide();
                this.mapillarySequenceLayer && this.mapillarySequenceLayer.hide();
                this.mapillaryObjects && this.mapillaryObjects.hide();
                this._graphicsLayer && this._graphicsLayer.hide();
                //this.node = null;
                //this._onNodeChanged(null);
                this._removeMapillaryClickEventFromMap();
            }
        },

        onMinimize: function() {
            this._resizeEvent();
        },

        onMaximize: function() {
            this._resizeEvent();
        }

        // onSignIn: function(credential){
        //   console.log('Mapillary::onSignIn', credential);
        // },

        // onSignOut: function(){
        //   console.log('Mapillary::onSignOut');
        // },

        // onPositionChange: function(){
        //   console.log('Mapillary::onPositionChange');
        // }
    })
});

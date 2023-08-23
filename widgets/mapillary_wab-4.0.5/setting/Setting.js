/* globals define */
define([
	'dojo/_base/declare',
	'dojo/_base/lang',
    'dojo/_base/Color',
	'dojo/has',
	'dojo/html',
	'dojo/dom-style',
	'dojo/dom-class',
	'dojo/on',
	'dojo/debounce',
	'dojo/store/Memory',
	'dijit/_WidgetsInTemplateMixin',
	'dijit/form/TextBox',
	'dijit/form/CheckBox',
	'dijit/form/ComboBox',
	'jimu/BaseWidgetSetting',

    'jimu/dijit/Message',
	'jimu/dijit/ColorPicker',
	'../TagCloud',
	'../mapillaryUtils',
	'dojo/text!../config.json',
	'dojo/text!./Setting.html'
],
function (declare, lang, Color, has, html, domStyle, domClass, on, debounce, Memory, _WidgetsInTemplateMixin, TextBox, CheckBox, ComboBox, BaseWidgetSetting, Message, ColorPicker, TagCloud, mapillaryUtils, defaultConfig, template) {
    try {
        defaultConfig = JSON.parse(defaultConfig);
    } catch (e) {

    }

	return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {
		baseClass: 'mapillary-setting',
		templateString: template,
        privateIconNode: null,
        clientIdNode: null,
        clientSecretNode: null,
		callbackUrlNode: null,
        defaultUserNameNode: null,
		defaultOrganizationNode: null,
        defaultOrganizationCoverageNode: null,
        layerColorPublic: null,
        layerColorOrganization: null,
        layerColorPrivate: null,

        /**
		 * Post Create
         */
		postCreate: function () {
			// the config object is passed in
			this.setConfig(lang.mixin({}, defaultConfig, this.config));
			this.privateIconNode.src = this.folderUrl + 'images/lock.svg';
            
            var origin = (window.location && window.location.origin) || window.global.location.origin; 
            //var detectedCallbackUrl = ( (!this.folderUrl.includes('http') ? origin : '') + this.folderUrl + 'oauth-callback.html');
            //mapillaryUtils.setCallbackUrl(this.config.callbackUrl || detectedCallbackUrl);

            this.userList = new TagCloud({
                searchAttr: 'username'
            }, this.userListNode);
            this.own(this.userList);

			this.own(this.clientId.on('change', function(val) {
				if (val !== this.config.clientId) {
                    mapillaryUtils.deauthenticate();
                    mapillaryUtils.setClientId(val);
                }
			}.bind(this)));

            this.own(this.userSearch.on('keyup', lang.hitch(this, debounce(this._onUsernameKeyup, 300))));
            this.own(this.userSearch.on('change', lang.hitch(this, this._onUsernameChange)));
            this.own(this.userList.on('remove', lang.hitch(this, this._onUsernameListChange)));
            this.own(this.userList.on('add', lang.hitch(this, this._onUsernameListChange)));
            this.own(mapillaryUtils.on('authenticate', this._onAuthenticate.bind(this)));
            this.own(mapillaryUtils.on('deauthenticate', this._onDeauthenticate.bind(this)));

            this.clientIdNode && domStyle.set(this.clientIdNode, 'display', '');
            this.clientSecretNode && domStyle.set(this.clientSecretNode, 'display', '');
            this.callbackUrlNode && domStyle.set(this.callbackUrlNode, 'display', '');
            if (this.config.callbackUrl) {
                this.callbackUrl.set('disabled', false);
            } else {
                //this.callbackUrl.set('disabled', true);
            }

            mapillaryUtils.getCurrentUser().then(function(user) {
                this._onAuthenticate.bind(this);
            }.bind(this)).otherwise(function() {
                this._onDeauthenticate.bind(this);
            }.bind(this));

			// this.own(on(this.signInButton, 'click', function(e) {
			//     e.stopPropagation();
			// 	e.preventDefault();
			// 	mapillaryUtils.authenticate(true);
			// }.bind(this)));

			//TODO: VERSION API DEPRICATED - this._checkLatestWidgetVersion();
		},

        destroy: function() {
		    this.inherited(arguments);
        },

        /**
         * Check Lates Widget Version
         * @private
         */
        // _checkLatestWidgetVersion: function() {
        //     return mapillaryUtils.getWidgetVersions().then(lang.hitch(this, function (ver) {
        //         if (!this.wab2) {
        //             ver = ver.esri_widget_1;
        //         } else {
        //             ver = ver.esri_widget_2;
        //         }
        //         if (mapillaryUtils.compareSemVer(this.version, ver.supported.version) < 0) {
        //             html.set(this.updateTextNode, lang.replace(this.nls.updateCriticalWidget, {
        //                 update_url: mapillaryUtils.updateUrl +  ver.latest.marketplaceId
        //             }));
        //             domStyle.set(this.updateNode, {
        //                 'background': '#ea1c26',
        //                 'display': ''
        //             });
        //         } else if (mapillaryUtils.compareSemVer(this.version, ver.latest.version) < 0) {
        //             html.set(this.updateTextNode, lang.replace(this.nls.updateWidget, {
        //                 update_url: mapillaryUtils.updateUrl +  ver.latest.marketplaceId
        //             }));
        //             domStyle.set(this.updateNode, {
        //                 'background': '#fd7f28',
        //                 'display': ''
        //             });
        //         } else {
        //             // up to date!
        //         }
        //     }));
        // },

        /**
		 * On Authenticate
         * @private
         */
		_onAuthenticate: function() {
            mapillaryUtils.getCurrentUser().then(function(user) {
                this.loggedInNode && domStyle.set(this.loggedInNode, 'display', '');
                this.loggedOutNode && domStyle.set(this.loggedOutNode, 'display', 'none');
                //this.callbackUrl.set('disabled', false);
                // this.wab1 = user.organizations.filter(function(org) {
                //     return org.permissions.indexOf('wab-1') > -1;
                // }).length;
                // this.wab2 = user.organizations.filter(function(org) {
                //     return org.permissions.indexOf('wab-2') > -1;
                // }).length;
                // if (this.wab2) {
                //     //this.defaultUserNameNode && domStyle.set(this.defaultUserNameNode, 'display', '');
                //     //this.defaultOrganizationNode && domStyle.set(this.defaultOrganizationNode, 'display', '');
                //     //this.defaultOrganizationCoverageNode && domStyle.set(this.defaultOrganizationCoverageNode, 'display', '');
                //     //this.defaultOrganization.set('disabled', false);
                //     //this.userSearch && this.userSearch.set('disabled', false);
                //     //this.userList && this.userList.set('disabled', false);
                //     //this.userList && domClass.remove(this.userList.domNode.parentNode, 'dijitDisabled');
                //     if (user) {
                //         if (this.defaultOrganization && user.organizations && user.organizations.length) {
                //             this.defaultOrganization.searchAttr = 'name';
                //             this.defaultOrganization.store.idProperty = 'key';
                //             this.defaultOrganization.store.setData(user.organizations);
                //         }
                //     }
                //     this.defaultOrganization && this.defaultOrganization.set('value', this.config.defaultOrganization && this.config.defaultOrganization !== '' ? this.defaultOrganization.store.get(this.config.defaultOrganization) && this.defaultOrganization.store.get(this.config.defaultOrganization).name : '');
                //     //TODO: VERSION API DEPRICATED - this._checkLatestWidgetVersion();
                // } else {
                //     //this.defaultUserNameNode && domStyle.set(this.defaultUserNameNode, 'display', 'none');
                //     //this.defaultOrganizationNode && domStyle.set(this.defaultOrganizationNode, 'display', 'none');
                //     //this.defaultOrganizationCoverageNode && domStyle.set(this.defaultOrganizationCoverageNode, 'display', 'none');
                //     //this.defaultOrganization.set('disabled', true);
                //     //this.userList && this.userList.set('disabled', true);
                //     //this.userSearch && this.userSearch.set('disabled', true);
                //     //this.userList && domClass.add(this.userList.domNode.parentNode, 'dijitDisabled');
                // }
            }.bind(this));
		},

        /**
		 * On Deauthenticate
         * @private
         */
		_onDeauthenticate: function(err) {
            this.loggedInNode && domStyle.set(this.loggedInNode, 'display', 'none');
            this.loggedOutNode && domStyle.set(this.loggedOutNode, 'display', '');
            this.defaultUserNameNode && domStyle.set(this.defaultUserNameNode, 'display', 'none');
            this.defaultOrganizationNode && domStyle.set(this.defaultOrganizationNode, 'display', 'none');
            this.defaultOrganizationCoverageNode && domStyle.set(this.defaultOrganizationCoverageNode, 'display', 'none');
            this.defaultOrganization && this.defaultOrganization.set('disabled', true);
            this.userList && this.userList.set('disabled', true);
            this.userSearch && this.userSearch.set('disabled', true);
            this.userList && domClass.add(this.userList.domNode.parentNode, 'dijitDisabled');
		},

        /**
         * On Username Change
         * @param e
         * @private
         */
        _onUsernameChange: function () {
            var _user;
            this.userSearch.searchAttr = 'username';
            this.userSearch.store.idProperty = 'username';
            this.userSearch.store.data.forEach(lang.hitch(this, function (user) {
                if (user.username === this.userSearch.get('value'))
                    _user = user;
            }));
            if (_user)
                this.userList.addValue(_user);
            this.userSearch.set('value', null);
            this.userSearch.store.setData([]);
        },

        /**
         * On Username Keyup
         * @param e
         * @private
         */
        _onUsernameKeyup: function (e) {
            if (e.keyCode === 13)
                return;
            this.userSearch.searchAttr = 'username';
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
						idProperty: 'username',
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
		 * Set Config
         * @param config Object
         */
		setConfig: function (config) {
			if (!config.clientId) {
                //domStyle.set(this.clientIdInstructionsNode, 'display', '');
            }
            this.clientId && this.clientId.set('value', config.clientId || '');
            this.clientSecret && this.clientSecret.set('value', config.clientSecret || '');
            if (!config.clientId && this.callbackUrl)
            	this.callbackUrl.set('disabled', true);
            this.callbackUrl && this.callbackUrl.set('value', config.callbackUrl || ''); //( (!this.folderUrl.includes('http') ? window.location.origin : '') + this.folderUrl + 'oauth-callback.html'));
            this.userList && this.userList.set('value', config.defaultUserName || '');
            this.hideUserFilter && this.hideUserFilter.set('checked', config.hideUserFilter);
            this.hideAuthentication && this.hideAuthentication.set('checked', config.hideAuthentication);
            this.useTransitions && this.useTransitions.set('checked', config.useTransitions);
            this.mapillaryImage && this.mapillaryImage.set('checked', config.mapillaryImage);
            this.mapillaryDirection && this.mapillaryDirection.set('checked', config.mapillaryDirection);
            this.mapillarySequence && this.mapillarySequence.set('checked', config.mapillarySequence);
            this.mapillaryBearing && this.mapillaryBearing.set('checked', config.mapillaryBearing);
            this.clearCoverageClose && this.clearCoverageClose.set('checked', config.clearCoverageClose);
            this.layerColorPublic && this.layerColorPublic.setColor(Color.fromHex(config.layerColorPublic));
            this.layerColorOrganization && this.layerColorOrganization.setColor(Color.fromHex(config.layerColorOrganization));
            this.layerColorPrivate && this.layerColorPrivate.setColor(Color.fromHex(config.layerColorPrivate));
            this.enableProxy && this.enableProxy.set('checked', config.enableProxy);
            this.proxyUrl && this.proxyUrl.set('value', config.proxyUrl || '');
                    
            this.enableAnonymous && this.enableAnonymous.set('checked', config.enableAnonymous);
            this.organizationId && this.organizationId.set('value', config.organizationId || '');
            if (mapillaryUtils.getClientId() && config.clientId !== mapillaryUtils.getClientId())
            	mapillaryUtils.deauthenticate();
            mapillaryUtils
				.setClientId(this.clientId.get('value'))
                .setClientSecret(this.clientSecret.get('value'))
                .setAuthScope('private:read')
				//.setCallbackUrl(this.callbackUrl.get('value'));
            //mapillaryUtils.authenticate(false).then(this._onAuthenticate.bind(this), this._onDeauthenticate.bind(this));
        },

        /**
		 * Get Config
         * @returns Object
         */
		getConfig: function () {
			// WAB will get config object through this method
			return {
                clientId: this.clientId && this.clientId.get('value'),
                clientSecret: this.clientSecret && this.clientSecret.get('value'),
                callbackUrl: this.callbackUrl && this.callbackUrl.get('value'),
                defaultOrganization: this.defaultOrganization && this.defaultOrganization.get('item') && this.defaultOrganization.get('item').key,
                defaultUserName: this.userList && (this.userList.get('value') || []).map(function(user) {
                    return user.username;
                }),
                hideUserFilter: this.hideUserFilter && this.hideUserFilter.get('checked'),
                hideAuthentication: this.hideAuthentication && this.hideAuthentication.get('checked'),
                hideImageTransition: this.hideImageTransition && this.hideImageTransition.get('checked'),
                useTransitions: this.useTransitions && this.useTransitions.get('checked'),
                mapillaryImage: this.mapillaryImage && this.mapillaryImage.get('checked'),
                mapillaryDirection: this.mapillaryDirection && this.mapillaryDirection.get('checked'),
                mapillarySequence: this.mapillarySequence && this.mapillarySequence.get('checked'),
                mapillaryBearing: this.mapillaryBearing && this.mapillaryBearing.get('checked'),
                clearCoverageClose: this.clearCoverageClose && this.clearCoverageClose.get('checked'),
                layerColorPublic: this.layerColorPublic && this.layerColorPublic.getColor().toHex(),
                layerColorOrganization: this.layerColorOrganization && this.layerColorOrganization.getColor().toHex(),
                layerColorPrivate: this.layerColorPrivate && this.layerColorPrivate.getColor().toHex(),
                enableProxy: this.enableProxy && this.enableProxy.get('checked'),
                proxyUrl: this.proxyUrl && this.proxyUrl.get('value'),
                enableAnonymous: this.enableAnonymous && this.enableAnonymous.get('checked'),
                organizationId: this.organizationId && this.organizationId.get('value')
            }
        }
        
	})
});

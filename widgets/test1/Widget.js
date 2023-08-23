define([
    'dojo/_base/declare',
    'jimu/BaseWidget',
    'esri/layers/FeatureLayer',
    'dojo/on',
    'dojo/_base/lang',
    'esri/layers/GraphicsLayer',
    "esri/graphic"
], function(declare, BaseWidget, FeatureLayer, on, lang, GraphicsLayer, Graphic) {
    return declare([BaseWidget], {
        baseClass: 'jimu-widget-custom',
        mergedLayer: null,

        startup: function() {
            this.inherited(arguments);
            this._bindEvents();
        },

        _bindEvents: function() {
            on(this.domNode.querySelector("#selectLayersButton"), 'click', lang.hitch(this, this._onSelectLayersClick));
            on(this.domNode.querySelector("#dataFusionButton"), 'click', lang.hitch(this, this._onDataFusionClick));
on(this.domNode.querySelector("#addToMapButton"), 'click', lang.hitch(this, this._onAddToMapClick));
        },

        _onSelectLayersClick: function() {
            let container = this.domNode.querySelector("#layerSelectContainer");
            container.style.display = "block";
            this._populateLayerSelect();
        },

        _populateLayerSelect: function() {
            let selectBox = this.domNode.querySelector("#layerSelect");
            let allLayerIds = this.map.layerIds.concat(this.map.graphicsLayerIds);
            allLayerIds.forEach(layerId => {
                let layer = this.map.getLayer(layerId);
                if (layer.declaredClass === "esri.layers.FeatureLayer") {
                    let option = document.createElement('option');
                    option.text = layer.name;
                    option.value = layerId;
                    selectBox.add(option);
                }
            });
        },
_onDataFusionClick: function() {
    let fidCounter = 1;
    let selectedLayers = Array.from(this.domNode.querySelector("#layerSelect").selectedOptions).map(option => option.value);

    let fieldMap = {};

    selectedLayers.forEach(layerId => {
        let layer = this.map.getLayer(layerId);
        layer.fields.forEach(field => {
            if (!fieldMap[field.name]) {
                fieldMap[field.name] = field.type;
            }
        });
    });

    let features = [];
    selectedLayers.forEach(layerId => {
        let layer = this.map.getLayer(layerId);
        layer.graphics.forEach(graphic => {
	
        let attributes = {};
            attributes["FID"] =fidCounter++;
console.log('fidCounter:', fidCounter);
    console.log('attributes["FID"]:', attributes["FID"]);
            Object.keys(fieldMap).forEach(fieldName => {
                if (fieldName !== "FID") {
        attributes[fieldName] = graphic.attributes[fieldName] !== undefined ? graphic.attributes[fieldName] : null;
    }
            });

            let newGraphic = new Graphic(
                graphic.geometry,
                null,
                attributes
            );
console.log("attributes FID:", attributes["FID"]);
console.log("newGraphic FID:", newGraphic.attributes["FID"]);
features.push(newGraphic);


        });
    });
features.forEach((graphic, index) => {
    console.log("Graphic " + index + " FID:", graphic.attributes["FID"]);
});
    let featureCollection = {
        layerDefinition: {
            geometryType: "esriGeometryPoint",
            fields: Object.keys(fieldMap).map(fieldName => {
                return {
                    name: fieldName,
                    type: fieldMap[fieldName],
                    alias: fieldName
                }
            })
        },
        featureSet: {
            features: features,
            geometryType: "esriGeometryPoint"
        }
    };

    let layerName = 'data_fusion_' + selectedLayers.map(layerId => this.map.getLayer(layerId).name).join("_");
    this.mergedLayer = new FeatureLayer(featureCollection, {
        id: layerName
    });

    let resultDiv = this.domNode.querySelector("#fusionResult");
    resultDiv.textContent = `Data fusion is complete. The new layer contains ${this.mergedLayer.graphics.length} points.`;
}

,

_onAddToMapClick: function() {
    if (this.mergedLayer) {
        // 获取颜色选择
        let colorValue = this.domNode.querySelector("#colorPicker").value;
        
        // 设置图层样式
        let symbol = new esri.symbol.SimpleMarkerSymbol().setColor(new dojo.Color(colorValue));
        this.mergedLayer.setRenderer(new esri.renderer.SimpleRenderer(symbol));
        
        // 添加图层到地图
        this.map.addLayer(this.mergedLayer);
        
        let resultDiv = this.domNode.querySelector("#fusionResult");
        resultDiv.textContent += ` The layer is added to the map.`;
    }
}








    });
});
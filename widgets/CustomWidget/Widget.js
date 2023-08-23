define([
  'dojo/_base/declare',
  'jimu/BaseWidget',
  'esri/tasks/query',
  'dojo/dom',
  'dojo/dom-style',
"esri/symbols/SimpleMarkerSymbol", // 添加SimpleMarkerSymbol模块
  "esri/renderers/SimpleRenderer",
"esri/layers/FeatureLayer",
"esri/graphic"
],
function(declare, BaseWidget, Query,dom, domStyle,
  SimpleMarkerSymbol,SimpleRenderer,FeatureLayer,Graphic) {

  return declare([BaseWidget], {

    baseClass: 'jimu-widget-customwidget',

    startup: function() {
      this.inherited(arguments);
      console.log('CustomWidget::startup');

      // 获取元素引用
      this.targetLayerButton = dom.byId('targetLayerButton');
      this.groundTruthLayerButton = dom.byId('groundTruthLayerButton');
      this.validationButton = dom.byId('validationButton');
      this.addToLayerButton = dom.byId('addToLayerButton');
      this.targetLayerSelect = dom.byId('targetLayerSelect');
      this.targetFieldButton = dom.byId('targetFieldButton');
      this.groundTruthLayerSelect = dom.byId('groundTruthLayerSelect');
      this.groundTruthFieldButton = dom.byId('groundTruthFieldButton');
      this.targetFieldSelect = dom.byId('targetFieldSelect');
      this.groundTruthFieldSelect = dom.byId('groundTruthFieldSelect');
      this.resultDiv = dom.byId('resultDiv');
      this.layerDiv = dom.byId('layerDiv');

      // 添加事件处理器
      this.targetLayerButton.onclick = this._onLayerButtonClick.bind(this, 'target');
      this.groundTruthLayerButton.onclick = this._onLayerButtonClick.bind(this, 'groundTruth');
      this.validationButton.onclick = this._onValidationButtonClick.bind(this);
      this.addToLayerButton.onclick = this._addToLayerButtonClick.bind(this);

      this.targetLayerSelect.onchange = this._onLayerSelectChange.bind(this, 'target');
      this.groundTruthLayerSelect.onchange = this._onLayerSelectChange.bind(this, 'groundTruth');

      this.targetFieldButton.onclick = this._onFieldButtonClick.bind(this, 'target');
      this.groundTruthFieldButton.onclick = this._onFieldButtonClick.bind(this, 'groundTruth');
    },

    _onLayerButtonClick: function(layerType) {
      var layerSelect, fieldButton;
      if (layerType === 'target') {
        layerSelect = this.targetLayerSelect;
        fieldButton = this.targetFieldButton;
      } else {  // 'groundTruth'
        layerSelect = this.groundTruthLayerSelect;
        fieldButton = this.groundTruthFieldButton;
      }

      if (domStyle.get(layerSelect, 'display') === 'none') {
        var layers = this.map.layerIds.concat(this.map.graphicsLayerIds).map(function(id) {
          return this.map.getLayer(id);
        }, this);

        while (layerSelect.firstChild) {
          layerSelect.removeChild(layerSelect.firstChild);
        }

        layers.forEach(function(layer) {
          var option = document.createElement('option');
          option.value = layer.id;
          option.text = layer.name || layer.id;
          layerSelect.appendChild(option);
        });

        domStyle.set(layerSelect, 'display', 'block');
      } else {
        domStyle.set(layerSelect, 'display', 'none');
      }

      domStyle.set(fieldButton, 'display', 'block');
    },

    _onLayerSelectChange: function(layerType) {
      var layerSelect, fieldButton;
      if (layerType === 'target') {
        layerSelect = this.targetLayerSelect;
        fieldButton = this.targetFieldButton;
      } else {  // 'groundTruth'
        layerSelect = this.groundTruthLayerSelect;
        fieldButton = this.groundTruthFieldButton;
      }

      var selectedLayer = this.map.getLayer(layerSelect.value);

      if (selectedLayer) {
        domStyle.set(fieldButton, 'display', 'block');
      }
    },

    _onFieldButtonClick: function(layerType) {
      var layerSelect, fieldSelect;
      if (layerType === 'target') {
        layerSelect = this.targetLayerSelect;
        fieldSelect = this.targetFieldSelect;
      } else {  // 'groundTruth'
        layerSelect = this.groundTruthLayerSelect;
        fieldSelect = this.groundTruthFieldSelect;
      }

      var selectedLayer = this.map.getLayer(layerSelect.value);

      if (selectedLayer) {
        var fields = selectedLayer.fields;

        while (fieldSelect.firstChild) {
          fieldSelect.removeChild(fieldSelect.firstChild);
        }

        fields.forEach(function(field) {
          var option = document.createElement('option');
          option.value = field.name;
          option.text = field.alias || field.name;
          fieldSelect.appendChild(option);
        });

        domStyle.set(fieldSelect, 'display', 'block');
      }
    },

    _onValidationButtonClick: function() {
      var targetLayer = this.map.getLayer(this.targetLayerSelect.value);
      var targetField = this.targetFieldSelect.value;

      var groundTruthLayer = this.map.getLayer(this.groundTruthLayerSelect.value);
      var groundTruthField = this.groundTruthFieldSelect.value;
      domStyle.set(this.addToLayerButton, 'display', 'block');

      if (!targetLayer || !targetField || !groundTruthLayer || !groundTruthField) {
        console.log('Please select both layers and fields first.');
        return;
      }

      var query = new Query();
      query.geometry = targetLayer.fullExtent;
      query.outFields = [targetField, groundTruthField];
      query.returnGeometry = true;

      groundTruthLayer.queryFeatures(query).then(function(featureSet) {
        var spatialCorrectPoints = 0;
        var valueCorrectPoints = 0;
        this.correctPoints = [];  // 新增：用于存储正确的点

        featureSet.features.forEach(function(feature) {
          var groundTruthValue = feature.attributes[groundTruthField];

          targetLayer.graphics.forEach(function(graphic) {
            if (graphic.geometry && feature.geometry.contains(graphic.geometry)) {
              spatialCorrectPoints++;

              var targetValue = graphic.attributes[targetField];
              if (targetValue === groundTruthValue) {
                valueCorrectPoints++;
                this.correctPoints.push(graphic);  // 新增：保存正确的点
              }
            }
          },this);
        },this);

        var totalPoints = targetLayer.graphics.length;
        var accuracy = totalPoints > 0 ? valueCorrectPoints / totalPoints : 0;

        this.resultDiv.textContent = 'Total number of points: ' + totalPoints +
          '\nSpatial correct points: ' + spatialCorrectPoints +
          '\nValue correct points: ' + valueCorrectPoints +
          '\nAccuracy: ' + accuracy;

        console.log('Validation result:', this.resultDiv.textContent);
      }.bind(this)).catch(function(error) {
        console.error('Failed to query features:', error);
      });
    },
    _addToLayerButtonClick: function() {
      var targetLayer = this.map.getLayer(this.targetLayerSelect.value);
      var targetField = this.targetFieldSelect.value;
      var targetLayerName = targetLayer.arcgisProps.title || targetLayer.id;


      var correctGraphics = targetLayer.graphics.filter(function(graphic) {
        return graphic.attributes[targetField] === graphic.attributes['groundTruthValue'];
      });

     var copiedPoints = this.correctPoints.map(function(point) {
    return new Graphic({
        geometry: point.geometry,
        attributes: point.attributes
    });
});
var featureCollection = {
    layerDefinition: {
        "geometryType": targetLayer.geometryType,
        "objectIdField": "ObjectID",
        "fields": targetLayer.fields,
        "drawingInfo": {
            "renderer": targetLayer.renderer
        },
        "spatialReference": targetLayer.spatialReference,
        "name": targetLayerName + " Correct"
    },
    featureSet: {
        "features": copiedPoints, // 直接使用 correctPoints
        "geometryType": targetLayer.geometryType
    }
};


  var newLayer = new FeatureLayer(featureCollection);
newLayer.id = targetLayerName + ' Correct';
newLayer.setVisibility(true);


      this.map.addLayer(newLayer);
newLayer.applyEdits(copiedPoints, null, null, function(addResults){
    console.log('Added features:', addResults);
}, function(error){
    console.error('Apply edits error:', error);
});
console.log('newlayer1:', newLayer);
newLayer.refresh();
console.log('newlayer2:', newLayer);
newLayer.on('load', function() {
  newLayer.applyEdits(copiedPoints, null, null, function(addResults){
    console.log('Added features:', addResults);
this.layerDiv.textContent = 'The new layer： ' + newLayer.id + 'has been added successfully' + '，the new layer contains the correct number of points:' + newLayer.graphics.length;
  }, function(error){
    console.error('Apply edits error:', error);
  });
});


      
      console.log('Target layer Name:', targetLayerName);
      console.log('Target layer:', targetLayer);
      console.log('Correct points:', this.correctPoints);
      console.log('First correct point:', this.correctPoints[0]);
      console.log('First correct point geometry:', this.correctPoints[0].geometry);
      console.log('correct Graphics:',correctGraphics);
      console.log('copiedPoints:',copiedPoints);
      console.log('newLayer:', newLayer);
      console.log('featureCollection.featureSet.features:', featureCollection.featureSet.features);
console.log('Update end:', newLayer.graphics.length);
newLayer.on('update-end', function(e){
  console.log('Update end:', newLayer.graphics.length);
});










      console.log('Layer addition result:', this.layerDiv.textContent);
    }
  });
});

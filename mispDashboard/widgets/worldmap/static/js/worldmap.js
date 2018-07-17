var osm;
var worldmap = function (container, options) {
    this.POLLING_FREQUENCY = 10000;

    options.container = container;
    this._options = {};

    this.parseOptions = function(options) {
        var _o = this._options;
        var o = options;

        if (o.endpoint !== undefined && typeof o.endpoint == 'string') {
            _o.endpoint = o.endpoint;
        } else {
            throw "Leaftlet must have a valid endpoint";
        }

        _o.pollingFrequency = o.pollingFrequency !== undefined ? o.pollingFrequency*1000 : this.POLLING_FREQUENCY;
        _o.name = o.name !== undefined ? o.name : "unnamed led";

        if (o.container !== undefined) {
            _o.container = o.container instanceof jQuery ? o.container : $('#'+o.container);
        } else {
            throw "LeafLet must have a container";
        }

        // pre-data is either the data to be shown or an URL from which the data should be taken from
        if (o.preData !== undefined) {
            if (Array.isArray(o.preData)){
                _o.preDataURL = null;
                _o.preData = o.preData;
            } else { // should fetch
                _o.preDataURL = o.preData;
                _o.preData = [];
            }
        } else { // no preData
            _o.preDataURL = null;
            _o.preData = [];
        }

        if (o.maxRotation !== undefined) {
            _o.maxRotation = o.maxRotation;
        }
        if (o.rotationWaitTime !== undefined) {
            _o.rotationWaitTime = o.rotationWaitTime;
        }
        if (o.zoomLevel !== undefined) {
            _o.zoomLevel = o.zoomLevel;
        }

        if (o.dotColor !== undefined) {
            _o.DOT_COLOR = o.dotColor;
        } else {
            _o.DOT_COLOR = '#ffff66';
        }

        _o.additionalOptions = o.additionalOptions;

        return _o;
    }


    this.connect_to_data_source = function() {
        var that = this;
        this.data_source = new EventSource(this._options.endpoint);
        this.data_source.onmessage = function(event) {
            var json = jQuery.parseJSON( event.data );
            var mapEvent = new that.MapEvent(json);
            that.mapEventManager.addMapEvent(mapEvent);

        };
        this.data_source.onopen = function(){
            // console.log('connection is opened. '+that.data_source.readyState);
        };
        this.data_source.onerror = function(){
            console.log('error: '+that.data_source.readyState);
            setTimeout(function() { console.log('reconnecting...'); that.connect_to_data_source(); }, 5000);
        };
    }

    this.MapEvent = function (json) {
        this.coord = json.coord;
        this.regionCode = json.regionCode;
        this.categ = json.categ;
        this.value = json.value;
        this.country = json.country;
        this.specifName = json.specifName;
        this.cityName = json.cityName;
        this.text = this.categ + ": " + this.value;
        this.textMarker = "<b>{1}</b><br>{2}".replace("{1}", this.country).replace("{2}", this.specifName+", "+this.cityName);
    };

    this.MapEventManager = function (openStreetMapObj) {
        var that = this;
        this.MAX_MARKER = 100;

        this.openStreetMapObj = openStreetMapObj;
        this._mapEventArray = [];
        this._coordSet = new Set();
        //Markers on the worldMap
        this._allMarkers = [];
        this._curMarkerNum = 0;
        //Region colors
        this.regionhits = {};
        this.regionhitsMax = 10;

        this.parseOptions = function(options) {
            if (options.maxMarker !== undefined) {
                this.MAX_MARKER = options.maxMarker;
            }

            this._options = options;

            this.vectorMapContainer = this._options.container.find('.jvectormap-container');
        };

        this.addMapEvent = function(mapevent) {
            if(this.getNumberOfEvent() >= this.MAX_ROTATION) {
                var toDel = this._mapEventArray[0];
                this._coordSet.delete(toDel.text);
                this._mapEventArray = this._mapEventArray.slice(1);
            }

            if(!this._coordSet.has(mapevent.text)) { // avoid duplicate map
                this._mapEventArray.push(mapevent);
                this._coordSet.add(mapevent.text);
                this.popupCoord(mapevent.coord, mapevent.regionCode);
            } else {
                //console.log('Duplicate coordinates');
            }
        };

        this.getNumberOfEvent = function() {
            return this._mapEventArray.length
        };

        this.popupCoord = function(coord, regionCode) {
            var coord = [coord.lat, coord.lon];
            var color = 0.5*180;
            var pnts = this.openStreetMapObj.latLngToPoint(coord[0], coord[1])
            if (pnts != false) { //sometimes latLngToPoint return false
                var addedMarker = this.openStreetMapObj.addMarker(this._curMarkerNum, coord, [color]);
                this._allMarkers.push(this._curMarkerNum)
                this.marker_animation(pnts.x, pnts.y, this._curMarkerNum);
                this.update_region(regionCode);

                this._curMarkerNum = this._curMarkerNum >= this.MAX_MARKER ? 0 : this._curMarkerNum+1;
                if (this._allMarkers.length >= this.MAX_MARKER) {
                    var to_remove = this._allMarkers[0];
                    this.openStreetMapObj.removeMarkers([to_remove]);
                    this._allMarkers = this._allMarkers.slice(1);
                }
            }
        }

        this.marker_animation = function(x, y, markerNum) {
            var markerColor = this.openStreetMapObj.markers[markerNum].element.config.style.current.fill;
            this.vectorMapContainer.append(
                $('<div class="marker_animation"></div>')
                .css({'left': x-15 + 'px'}) /* HACK to center the effect */
                .css({'top': y-15 + 'px'})
                .css({ 'background-color': markerColor })
                .animate({ opacity: 0, scale: 1, height: '80px', width:'80px', margin: '-25px' }, 400, 'linear', function(){$(this).remove(); })
            );
        }

        this.update_region = function(regionCode) {
            if (this.regionhits.hasOwnProperty(regionCode)) {
                this.regionhits[regionCode] += 1;
            } else {
                this.regionhits[regionCode] = 1;
            }
            // Force recomputation of min and max for correct color scaling
            this.regionhitsMax = this.regionhitsMax >= this.regionhits[regionCode] ? this.regionhitsMax : this.regionhits[regionCode];
            this.openStreetMapObj.series.regions[0].params.max = this.regionhitsMax;
            // Update data
            this.openStreetMapObj.series.regions[0].setValues(this.regionhits);
            this.openStreetMapObj.series.regions[0].legend.render()
        }

    };

    this.parseOptions(options);
    this._options.container.vectorMap({
        map: 'world_mill',
        markers: [],
        series: {
            markers: [{
                attribute: 'fill',
                // scale: ['#1A0DAB', '#e50000', '#62ff41'],
                // scale: ['#ffff66'],
                scale: [this._options.DOT_COLOR],
                values: [],
                min: 0,
                max: 180
            }],
            regions: [{
                values: [],
                min: 0,
                max: 10,
                scale:      ['#003FBF','#0063BF','#0087BF','#00ACBF','#00BFAD','#00BF89','#00BF64','#00BF40','#00BF1C','#08BF00','#2CBF00','#51BF00','#75BF00','#99BF00','#BEBF00','#BF9B00','#BF7700','#BF5200','#BF2E00','#BF0900'],
                normalizeFunction: 'linear',
                legend: {
                    horizontal: true
                }
            }]
        },
    });
    this.openStreetMapObj = this._options.container.vectorMap('get','mapObject');
    osm = this.openStreetMapObj;

    this.data_source;
    this.mapEventManager = new this.MapEventManager(this.openStreetMapObj);
    this.mapEventManager.parseOptions(this._options);

    // display (and fetch if needed) existing data
    var that = this;
    if (this._options.preDataURL !== null) {
        $.when(
            $.ajax({
                dataType: "json",
                url: this._options.preDataURL,
                data: this._options.additionalOptions,
                success: function(data) {
                    that.preData = data;
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    console.log(textStatus);
                    that.preData = [];
                }
            })
        ).then(
            function() { // success
                // add data to the widget
                that.preData.forEach(function(j) {
                    var mapEvent = new MapEvent(j);
                    that.mapEventManager.addMapEvent(mapEvent, true);
                });
            }, function() { // fail
            }
        ).always(
            function() {
                // to the flask eventStream
                that.connect_to_data_source();
            }
        );
    } else {
        // Subscribe to the flask eventStream
        this.connect_to_data_source();
    }

};


$(document).ready(function () {

});

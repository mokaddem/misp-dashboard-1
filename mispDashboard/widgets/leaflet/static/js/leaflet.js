var leaflet_widget = function (container, options) {
    this.OSMURL='http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
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

        _o.additionalOptions = o.additionalOptions;

        return _o;
    }


    this.connect_to_data_source = function() {
        var that = this;
        this.data_source = new EventSource(this._options.endpoint);
        this.data_source.onmessage = function(event) {
            var json = jQuery.parseJSON( event.data );
            var marker = L.marker([json.coord.lat, json.coord.lon]).addTo(that.myOpenStreetMap);
            var mapEvent = new that.MapEvent(json, marker);
            that.mapEventManager.addMapEvent(mapEvent);

        };
        this.data_source.onopen = function(){
            // console.log('connection is opened. '+that.data_source.readyState);
        };
        this.data_source.onerror = function(){
            console.log('error: '+that.data_source.readyState);
            setTimeout(function() { that.connect_to_data_source(); }, 5000);
        };
    }

    this.MapEvent = function (json, marker) {
        this.coord = json.coord;
        this.regionCode = json.regionCode;
        this.marker = marker;
        this.categ = json.categ;
        this.value = json.value;
        this.country = json.country;
        this.specifName = json.specifName;
        this.cityName = json.cityName;
        this.text = this.categ + ": " + this.value;
        this.textMarker = "<b>{1}</b><br>{2}".replace("{1}", this.country).replace("{2}", this.specifName+", "+this.cityName);
    };

    this.MapEventManager = function (myOpenStreetMap) {
        var that = this;
        this.MAX_ROTATION = 10;
        this.ROTATION_WAIT_TIME = 15000;
        this.ZOOM_LEVEL = 7;

        this.myOpenStreetMap = myOpenStreetMap;
        this._mapEventArray = [];
        this._currentMapEvent;
        this._nextEventToShow = 0;
        this._first_map = true;
        this._coordSet = new Set();
        //current lat and lon shown in worldMap
        this._latToPing;
        this._lonToPing;
        //Markers on the worldMap
        this._allMarkers = [];
        this._curMarkerNum = 0;
        //use for cancelTimeout
        this._timeoutRotate;

        this.parseOptions = function(options) {
            if (options.maxRotation !== undefined) {
                this.MAX_ROTATION = options.maxRotation;
            }
            if (options.rotationWaitTime !== undefined) {
                this.ROTATION_WAIT_TIME = options.rotationWaitTime;
            }
            if (options.zoomLevel !== undefined) {
                this.ZOOM_LEVEL = options.zoomLevel;
            }
        };

        this.addMapEvent = function(mapevent, doNotRotate) {
            if(this.getNumberOfEvent() >= this.MAX_ROTATION) {
                var toDel = this._mapEventArray[0];
                toDel.marker.remove(); // remove marker
                this._coordSet.delete(toDel.text);
                this._mapEventArray = this._mapEventArray.slice(1);
            }

            if(!this._coordSet.has(mapevent.text)) { // avoid duplicate map
                this._mapEventArray.push(mapevent);
                this._coordSet.add(mapevent.text);
            } else {
                //console.log('Duplicate coordinates');
            }

            if (doNotRotate === undefined || !doNotRotate) {
                if(this._first_map) { // remove no_map pic
                    this.rotateMap();
                    this._first_map = false;
                } else {
                    this.rotateMap(mapevent);
                }
            }
        };

        this.getNumberOfEvent = function() {
            return this._mapEventArray.length
        };

        this.getNextEventToShow = function() {
            var toShow = this._mapEventArray[this._nextEventToShow];
            this._nextEventToShow = this._nextEventToShow == this._mapEventArray.length-1 ? 0 : this._nextEventToShow+1;
            this._currentMapEvent = toShow;
            return toShow;
        };

        this.getCurrentMapEvent = function() {
            return this._currentMapEvent;
        };

        // Perform the roration of the map in the openStreetMap pannel
        this.rotateMap = function(mapEvent) {
            var that = this;
            clearTimeout(this._timeoutRotate); //cancel current map rotation
            if (mapEvent == undefined) {
                var mapEvent = this.getNextEventToShow();
            }
            var marker = mapEvent.marker;
            this.myOpenStreetMap.flyTo([mapEvent.coord.lat, mapEvent.coord.lon], this.ZOOM_LEVEL);
            mapEvent.marker.bindPopup(mapEvent.textMarker).openPopup();

            $("#textMap1").text(mapEvent.text);
            if(this.ROTATION_WAIT_TIME != 0) {
                this._timeoutRotate = setTimeout(function(){ that.rotateMap(); }, this.ROTATION_WAIT_TIME);
            }
        };

        this.directZoom = function() {
            var mapEvent = this.getCurrentMapEvent();
            if (mapEvent != undefined)
                this.myOpenStreetMap.flyTo([mapEvent.coord.lat, mapEvent.coord.lon], this.ZOOM_LEVEL);
        };
    };


    this.parseOptions(options);
    this.myOpenStreetMap = L.map(container).setView([0, 0], 1);
    this.osm = new L.TileLayer(this.OSMURL, {minZoom: 0, maxZoom: 18}).addTo(this.myOpenStreetMap);

    this.data_source;
    this.mapEventManager = new this.MapEventManager(this.myOpenStreetMap);
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
                    var marker = L.marker([j.coord.lat, j.coord.lon]).addTo(that.myOpenStreetMap);
                    var mapEvent = new that.MapEvent(j, marker);
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
    $( "#rotation_wait_time_selector" ).change(function() {
        var sel = parseInt($( this ).val());
        if(isNaN(sel)) {
            rotation_wait_time = 0;
        } else {
            rotation_wait_time = sel;
        }
        // var old = ROTATION_WAIT_TIME;
        // ROTATION_WAIT_TIME = 1000*rotation_wait_time; //seconds
        if(old == 0) {
            mapEventManager._timeoutRotate = setTimeout(function(){ mapEventManager.rotateMap(); }, this.ROTATION_WAIT_TIME);
        }
    });

    $( "#zoom_selector" ).change(function() {
        var sel = parseInt($( this ).val());
        // ZOOM_LEVEL = sel;
        mapEventManager.directZoom();
    });
});

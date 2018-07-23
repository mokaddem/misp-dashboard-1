(function(factory) {
        "use strict";
        if (typeof define === 'function' && define.amd) {
            define(['jquery'], factory);
        } else if (window.jQuery && !window.jQuery.fn.Worldmap) {
            factory(window.jQuery);
        }
    }
    (function($) {
        'use strict';

        // Worldmap object
        var Worldmap = function (container, options) {
            this.POLLING_FREQUENCY = 10000;

            options.container = container;
            this.connectionState = 'not connected';
            this._options = {};

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

            // add status led
            this._ev_timer = null;
            this._ev_retry_frequency = 5; // sec
            this._cur_ev_retry_count = 0;
            this._ev_retry_count_thres = 3;
            var led_container = $('<div class="led-container" style="margin-left: 10px;"></div>');
            var led = $('<div class="led-small led_red"></div>');
            this.statusLed = led;
            led_container.append(led);
            var header = this._options.container.parent().parent().find('.panel-heading');
            if (header.length > 0) { // add in panel header
                header.append(led_container);
            } else { // add over the map
                this._options.container.append(led_container);
            }

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
                            var mapEvent = new that.MapEvent(j);
                            that.mapEventManager.addMapEvent(mapEvent);
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

        Worldmap.prototype = {
            constructor: Worldmap,

            parseOptions: function(options) {
                var _o = this._options;
                var o = options;

                if (o.endpoint !== undefined && typeof o.endpoint == 'string') {
                    _o.endpoint = o.endpoint;
                } else {
                    throw "Worldmap must have a valid endpoint";
                }

                _o.pollingFrequency = o.pollingFrequency !== undefined ? o.pollingFrequency*1000 : this.POLLING_FREQUENCY;
                _o.name = o.name !== undefined ? o.name : "unnamed worldmap";

                if (o.container !== undefined) {
                    _o.container = o.container instanceof jQuery ? o.container : $('#'+o.container);
                } else {
                    throw "Worldmap must have a container";
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
            },

            connect_to_data_source: function() {
                var that = this;
                if (!this.data_source) {
                    this.data_source = new EventSource(this._options.endpoint);
                    this.data_source.onmessage = function(event) {
                        var json = jQuery.parseJSON( event.data );
                        var mapEvent = new that.MapEvent(json);
                        that.mapEventManager.addMapEvent(mapEvent);

                    };
                    this.data_source.onopen = function(){
                        that._cur_ev_retry_count = 0;
                        that.update_connection_state('connected');
                    };
                    this.data_source.onerror = function(){
                        if (that.data_source.readyState == 0) { // connecting
                            that.update_connection_state('connecting');
                        }  else if (that.data_source.readyState == 2) { // closed, reconnect with new object
                            that.reconnection_logique();
                        } else {
                            that.update_connection_state('not connected');
                            that.reconnection_logique();
                        }
                    };
                }
            },

            reconnection_logique: function() {
                var that = this;
                if (that.data_source) {
                    that.data_source.close();
                    that.data_source = null;
                }
                if (that._ev_timer) {
                    clearTimeout(that._ev_timer);
                }
                if(that._cur_ev_retry_count >= that._ev_retry_count_thres) {
                    that.update_connection_state('not connected');
                } else {
                    that._cur_ev_retry_count++;
                    that.update_connection_state('connecting');
                }
                that._ev_timer = setTimeout(function () { that.connect_to_data_source(); }, that._ev_retry_frequency*1000);
            },

            update_connection_state: function(connectionState) {
                this.connectionState = connectionState;
                this.updateDOMState(this.statusLed, connectionState);
            },

            updateDOMState: function(led, state) {
                switch (state) {
                    case 'connected':
                        led.removeClass("led_red");
                        led.removeClass("led_orange");
                        led.addClass("led_green");
                        break;
                    case 'not connected':
                        led.removeClass("led_green");
                        led.removeClass("led_orange");
                        led.addClass("led_red");
                        break;
                    case 'connecting':
                        led.removeClass("led_green");
                        led.removeClass("led_red");
                        led.addClass("led_orange");
                        break;
                    default:
                        led.removeClass("led_green");
                        led.removeClass("led_orange");
                        led.addClass("led_red");
                }
            },

            MapEvent: function (json) {
                this.coord = json.coord;
                this.regionCode = json.regionCode;
                this.categ = json.categ;
                this.value = json.value;
                this.country = json.country;
                this.specifName = json.specifName;
                this.cityName = json.cityName;
                this.text = this.categ + ": " + this.value;
                this.textMarker = "<b>{1}</b><br>{2}".replace("{1}", this.country).replace("{2}", this.specifName+", "+this.cityName);
            },

            MapEventManager: function (openStreetMapObj) {
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
            }
        }

        $.worldmap = Worldmap;
        $.fn.worldmap = function(option) {
            var pickerArgs = arguments;

            return this.each(function() {
                var $this = $(this),
                    inst = $this.data('worldmap'),
                    options = ((typeof option === 'object') ? option : {});
                if ((!inst) && (typeof option !== 'string')) {
                    $this.data('worldmap', new Worldmap(this, options));
                } else {
                    if (typeof option === 'string') {
                        inst[option].apply(inst, Array.prototype.slice.call(pickerArgs, 1));
                    }
                }
            });
        };

        $.fn.worldmap.constructor = Worldmap;

    }));


$(document).ready(function () {

});




// var Worldmap = function (container, options) {
//     this.POLLING_FREQUENCY = 10000;
//
//     options.container = container;
//     this._options = {};
//
//     this.parseOptions = function(options) {
//         var _o = this._options;
//         var o = options;
//
//         if (o.endpoint !== undefined && typeof o.endpoint == 'string') {
//             _o.endpoint = o.endpoint;
//         } else {
//             throw "Leaftlet must have a valid endpoint";
//         }
//
//         _o.pollingFrequency = o.pollingFrequency !== undefined ? o.pollingFrequency*1000 : this.POLLING_FREQUENCY;
//         _o.name = o.name !== undefined ? o.name : "unnamed led";
//
//         if (o.container !== undefined) {
//             _o.container = o.container instanceof jQuery ? o.container : $('#'+o.container);
//         } else {
//             throw "LeafLet must have a container";
//         }
//
//         // pre-data is either the data to be shown or an URL from which the data should be taken from
//         if (o.preData !== undefined) {
//             if (Array.isArray(o.preData)){
//                 _o.preDataURL = null;
//                 _o.preData = o.preData;
//             } else { // should fetch
//                 _o.preDataURL = o.preData;
//                 _o.preData = [];
//             }
//         } else { // no preData
//             _o.preDataURL = null;
//             _o.preData = [];
//         }
//
//         if (o.maxRotation !== undefined) {
//             _o.maxRotation = o.maxRotation;
//         }
//         if (o.rotationWaitTime !== undefined) {
//             _o.rotationWaitTime = o.rotationWaitTime;
//         }
//         if (o.zoomLevel !== undefined) {
//             _o.zoomLevel = o.zoomLevel;
//         }
//
//         if (o.dotColor !== undefined) {
//             _o.DOT_COLOR = o.dotColor;
//         } else {
//             _o.DOT_COLOR = '#ffff66';
//         }
//
//         _o.additionalOptions = o.additionalOptions;
//
//         return _o;
//     }
//
//
//     this.connect_to_data_source = function() {
//         var that = this;
//         this.data_source = new EventSource(this._options.endpoint);
//         this.data_source.onmessage = function(event) {
//             var json = jQuery.parseJSON( event.data );
//             var mapEvent = new that.MapEvent(json);
//             that.mapEventManager.addMapEvent(mapEvent);
//
//         };
//         this.data_source.onopen = function(){
//             // console.log('connection is opened. '+that.data_source.readyState);
//         };
//         this.data_source.onerror = function(){
//             console.log('error: '+that.data_source.readyState);
//             setTimeout(function() { console.log('reconnecting...'); that.connect_to_data_source(); }, 5000);
//         };
//     }
//
//     this.MapEvent = function (json) {
//         this.coord = json.coord;
//         this.regionCode = json.regionCode;
//         this.categ = json.categ;
//         this.value = json.value;
//         this.country = json.country;
//         this.specifName = json.specifName;
//         this.cityName = json.cityName;
//         this.text = this.categ + ": " + this.value;
//         this.textMarker = "<b>{1}</b><br>{2}".replace("{1}", this.country).replace("{2}", this.specifName+", "+this.cityName);
//     };
//
//     this.MapEventManager = function (openStreetMapObj) {
//         var that = this;
//         this.MAX_MARKER = 100;
//
//         this.openStreetMapObj = openStreetMapObj;
//         this._mapEventArray = [];
//         this._coordSet = new Set();
//         //Markers on the worldMap
//         this._allMarkers = [];
//         this._curMarkerNum = 0;
//         //Region colors
//         this.regionhits = {};
//         this.regionhitsMax = 10;
//
//         this.parseOptions = function(options) {
//             if (options.maxMarker !== undefined) {
//                 this.MAX_MARKER = options.maxMarker;
//             }
//
//             this._options = options;
//
//             this.vectorMapContainer = this._options.container.find('.jvectormap-container');
//         };
//
//         this.addMapEvent = function(mapevent) {
//             if(this.getNumberOfEvent() >= this.MAX_ROTATION) {
//                 var toDel = this._mapEventArray[0];
//                 this._coordSet.delete(toDel.text);
//                 this._mapEventArray = this._mapEventArray.slice(1);
//             }
//
//             if(!this._coordSet.has(mapevent.text)) { // avoid duplicate map
//                 this._mapEventArray.push(mapevent);
//                 this._coordSet.add(mapevent.text);
//                 this.popupCoord(mapevent.coord, mapevent.regionCode);
//             } else {
//                 //console.log('Duplicate coordinates');
//             }
//         };
//
//         this.getNumberOfEvent = function() {
//             return this._mapEventArray.length
//         };
//
//         this.popupCoord = function(coord, regionCode) {
//             var coord = [coord.lat, coord.lon];
//             var color = 0.5*180;
//             var pnts = this.openStreetMapObj.latLngToPoint(coord[0], coord[1])
//             if (pnts != false) { //sometimes latLngToPoint return false
//                 var addedMarker = this.openStreetMapObj.addMarker(this._curMarkerNum, coord, [color]);
//                 this._allMarkers.push(this._curMarkerNum)
//                 this.marker_animation(pnts.x, pnts.y, this._curMarkerNum);
//                 this.update_region(regionCode);
//
//                 this._curMarkerNum = this._curMarkerNum >= this.MAX_MARKER ? 0 : this._curMarkerNum+1;
//                 if (this._allMarkers.length >= this.MAX_MARKER) {
//                     var to_remove = this._allMarkers[0];
//                     this.openStreetMapObj.removeMarkers([to_remove]);
//                     this._allMarkers = this._allMarkers.slice(1);
//                 }
//             }
//         }
//
//         this.marker_animation = function(x, y, markerNum) {
//             var markerColor = this.openStreetMapObj.markers[markerNum].element.config.style.current.fill;
//             this.vectorMapContainer.append(
//                 $('<div class="marker_animation"></div>')
//                 .css({'left': x-15 + 'px'}) /* HACK to center the effect */
//                 .css({'top': y-15 + 'px'})
//                 .css({ 'background-color': markerColor })
//                 .animate({ opacity: 0, scale: 1, height: '80px', width:'80px', margin: '-25px' }, 400, 'linear', function(){$(this).remove(); })
//             );
//         }
//
//         this.update_region = function(regionCode) {
//             if (this.regionhits.hasOwnProperty(regionCode)) {
//                 this.regionhits[regionCode] += 1;
//             } else {
//                 this.regionhits[regionCode] = 1;
//             }
//             // Force recomputation of min and max for correct color scaling
//             this.regionhitsMax = this.regionhitsMax >= this.regionhits[regionCode] ? this.regionhitsMax : this.regionhits[regionCode];
//             this.openStreetMapObj.series.regions[0].params.max = this.regionhitsMax;
//             // Update data
//             this.openStreetMapObj.series.regions[0].setValues(this.regionhits);
//             this.openStreetMapObj.series.regions[0].legend.render()
//         }
//
//     };
//
//     this.parseOptions(options);
//     this._options.container.vectorMap({
//         map: 'world_mill',
//         markers: [],
//         series: {
//             markers: [{
//                 attribute: 'fill',
//                 // scale: ['#1A0DAB', '#e50000', '#62ff41'],
//                 // scale: ['#ffff66'],
//                 scale: [this._options.DOT_COLOR],
//                 values: [],
//                 min: 0,
//                 max: 180
//             }],
//             regions: [{
//                 values: [],
//                 min: 0,
//                 max: 10,
//                 scale:      ['#003FBF','#0063BF','#0087BF','#00ACBF','#00BFAD','#00BF89','#00BF64','#00BF40','#00BF1C','#08BF00','#2CBF00','#51BF00','#75BF00','#99BF00','#BEBF00','#BF9B00','#BF7700','#BF5200','#BF2E00','#BF0900'],
//                 normalizeFunction: 'linear',
//                 legend: {
//                     horizontal: true
//                 }
//             }]
//         },
//     });
//     this.openStreetMapObj = this._options.container.vectorMap('get','mapObject');
//     osm = this.openStreetMapObj;
//
//     this.data_source;
//     this.mapEventManager = new this.MapEventManager(this.openStreetMapObj);
//     this.mapEventManager.parseOptions(this._options);
//
//     // display (and fetch if needed) existing data
//     var that = this;
//     if (this._options.preDataURL !== null) {
//         $.when(
//             $.ajax({
//                 dataType: "json",
//                 url: this._options.preDataURL,
//                 data: this._options.additionalOptions,
//                 success: function(data) {
//                     that.preData = data;
//                 },
//                 error: function(jqXHR, textStatus, errorThrown) {
//                     console.log(textStatus);
//                     that.preData = [];
//                 }
//             })
//         ).then(
//             function() { // success
//                 // add data to the widget
//                 that.preData.forEach(function(j) {
//                     var mapEvent = new MapEvent(j);
//                     that.mapEventManager.addMapEvent(mapEvent, true);
//                 });
//             }, function() { // fail
//             }
//         ).always(
//             function() {
//                 // to the flask eventStream
//                 that.connect_to_data_source();
//             }
//         );
//     } else {
//         // Subscribe to the flask eventStream
//         this.connect_to_data_source();
//     }
//
// };
//
//
// $(document).ready(function () {
//
// });

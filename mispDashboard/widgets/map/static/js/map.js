(function(factory) {
        "use strict";
        if (typeof define === 'function' && define.amd) {
            define(['jquery'], factory);
        } else if (window.jQuery && !window.jQuery.fn.Leaflet_widget) {
            factory(window.jQuery);
        }
    }
    (function($) {
        'use strict';

        // leaflet_widget object
        var Leaflet_widget = function (container, options) {
            this._default_options = {
                osmurl: 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                pollingFrequency: 5000,
                maxRotation: 10,
                rotationWaitTime: 15000,
                zoomLevel: 7,
            }
            options.container = container;
            this._options = {};

            this.validateOptions(options);
            this._options = $.extend({}, this._default_options, options);

            this.myOpenStreetMap = L.map(container).setView([0, 0], 1);
            this.osm = new L.TileLayer(this._options.osmurl, {minZoom: 0, maxZoom: 18}).addTo(this.myOpenStreetMap);

            // add status led
            this._ev_timer = null;
            this._ev_retry_frequency = this._options.pollingFrequency; // sec
            this._cur_ev_retry_count = 0;
            this._ev_retry_count_thres = 3;
            var led_container = $('<div class="led-container" style="margin-right: 10px; float: right;"></div>');
            var led = $('<div class="led-small led_red"></div>');
            this.statusLed = led;
            led_container.append(led);
            var header = this._options.container.parent().parent().find('.panel-heading');
            if (header.length > 0) { // add in panel header
                header.append(led_container);
            } else { // add over the map in the correct container
                this._options.container.find('div.leaflet-top.leaflet-right').append(led_container);
            }

            this.data_source;
            this.mapEventManager = new this.MapEventManager(this.myOpenStreetMap);
            this.mapEventManager.validateOptions(this._options);

            // display (and fetch if needed) existing data
            var that = this;
            if (this._options.preDataURL !== null) {
                $.when(
                    $.ajax({
                        dataType: "json",
                        url: this._options.preDataURL,
                        data: this._options.additionalOptions,
                        success: function(data) {
                            that._options.preData = data;
                        },
                        error: function(jqXHR, textStatus, errorThrown) {
                            console.log(textStatus);
                            that._options.preData = [];
                        }
                    })
                ).then(
                    function() { // success
                        // add data to the widget
                        that._options.preData.forEach(function(j) {
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
                // add data to the widget
                that._options.preData.forEach(function(j) {
                    var marker = L.marker([j.coord.lat, j.coord.lon]).addTo(that.myOpenStreetMap);
                    var mapEvent = new that.MapEvent(j, marker);
                    that.mapEventManager.addMapEvent(mapEvent, true);
                });
                // Subscribe to the flask eventStream
                this.connect_to_data_source();
            }
        };

        Leaflet_widget.prototype = {
            constructor: Leaflet_widget,

            validateOptions: function(options) {
                var o = options;

                if (o.endpoint === undefined || typeof o.endpoint != 'string') {
                    throw "Map must have a valid endpoint";
                }

                if (o.container === undefined) {
                    throw "Map must have a container";
                } else {
                    o.container = o.container instanceof jQuery ? o.container : $('#'+o.container);
                }

                // pre-data is either the data to be shown or an URL from which the data should be taken from
                if (Array.isArray(o.preData)){
                    o.preDataURL = null;
                    o.preData = o.preData;
                } else if (o.preData !== undefined) { // should fetch
                    o.preDataURL = o.preData;
                    o.preData = [];
                }
            },

            connect_to_data_source: function() {
                var that = this;
                if (!this.data_source) {
                    this.data_source = new EventSource(this._options.endpoint);
                    this.data_source.onmessage = function(event) {
                        var json = jQuery.parseJSON( event.data );
                        var marker = L.marker([json.coord.lat, json.coord.lon]).addTo(that.myOpenStreetMap);
                        var mapEvent = new that.MapEvent(json, marker);
                        that.mapEventManager.addMapEvent(mapEvent);

                    };
                    this.data_source.onopen = function(){
                        that._cur_ev_retry_count = 0;
                        that.update_connection_state('connected');
                    };
                    this.data_source.onerror = function(){
                        if (that.data_source.readyState == 0) { // reconnecting
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

            reconnection_logique: function () {
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

            MapEvent: function (json, marker) {
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
            },

            MapEventManager: function (myOpenStreetMap) {
                var that = this;

                this.myOpenStreetMap = myOpenStreetMap;
                this._mapEventArray = [];
                this._currentMapEvent;
                this._nextEventToShow = 0;
                this._first_map = true;
                this._coordSet = new Set();
                this._timeoutRotate; // use for cancelTimeout

                this.validateOptions = function(options) {
                    this._options = options;
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

                // Perform the rotation of the map in the openStreetMap pannel
                this.rotateMap = function(mapEvent) {
                    var that = this;
                    clearTimeout(this._timeoutRotate); //cancel current map rotation
                    if (mapEvent == undefined) {
                        var mapEvent = this.getNextEventToShow();
                    }
                    var marker = mapEvent.marker;
                    this.myOpenStreetMap.flyTo([mapEvent.coord.lat, mapEvent.coord.lon], that._options.zoomLevel);
                    mapEvent.marker.bindPopup(mapEvent.textMarker).openPopup();

                    $("#textMap1").text(mapEvent.text);
                    if(this._options.rotationWaitTime != 0) {
                        this._timeoutRotate = setTimeout(function(){ that.rotateMap(); }, that._options.rotationWaitTime);
                    }
                };

                this.directZoom = function() {
                    var mapEvent = this.getCurrentMapEvent();
                    if (mapEvent != undefined)
                        this.myOpenStreetMap.flyTo([mapEvent.coord.lat, mapEvent.coord.lon], that._options.zoomLevel);
                };
            }
        }

        $.leaflet_widget = Leaflet_widget;
        $.fn.leaflet_widget = function(option) {
            var pickerArgs = arguments;

            return this.each(function() {
                var $this = $(this),
                    inst = $this.data('leaflet_widget'),
                    options = ((typeof option === 'object') ? option : {});
                if ((!inst) && (typeof option !== 'string')) {
                    $this.data('leaflet_widget', new Leaflet_widget(this, options));
                } else {
                    if (typeof option === 'string') {
                        inst[option].apply(inst, Array.prototype.slice.call(pickerArgs, 1));
                    }
                }
            });
        };

        $.fn.leaflet_widget.constructor = Leaflet_widget;

    }));

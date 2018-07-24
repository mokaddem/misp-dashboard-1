(function(factory) {
        "use strict";
        if (typeof define === 'function' && define.amd) {
            define(['jquery'], factory);
        } else if (window.jQuery && !window.jQuery.fn.geoquery) {
            factory(window.jQuery);
        }
    }
    (function($) {
        'use strict';

        // geoquery object
        var Geoquery = function (container, options) {
            this._default_options = {
                osmurl: 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                circleColor: 'red'
            }

            options.container = container;
            this.validateOptions(options);
            this._options = $.extend({}, this._default_options, options);

            var circleRadiusOptions = {
                color: this._options.circleColor,
                weight: 1,
                fillColor: this._options.circleColor,
                fillOpacity: 0.4,
            };
            this.circleRadius;
            this.savedMarkers;

            var dp_options = {
                selectBackward: true,
                showShortcuts: true,
                endDate: new Date(),
                shortcuts : {
                    'prev-days': [3,5,7],
                    'prev': ['week','month'],
                    'next-days':null,
                    'next':null
                },
            };
            var that = this;

            this.myOpenStreetMap = L.map(container).setView([0, 0], 1);
            this.osm = new L.TileLayer(this._options.osmurl, {minZoom: 0, maxZoom: 18}).addTo(this.myOpenStreetMap);
            circleRadiusOptions.radius = this.getScale(this.myOpenStreetMap.getZoom());
            this.circleRadius = L.circle(this.myOpenStreetMap.getCenter(), circleRadiusOptions)
                                    .addTo(this.myOpenStreetMap);

            // add query and datepicker buttons
            var daterange_btn = $('<button>Dates</button>');
            var query_btn = $('<button disabled>Query<div class="spinner-small hide"></div></button>');
            // var query_btn = $('<button disabled>Query<div class="spinner-small-container"><div class="spinner-small"></div></div></button>');
            let now = new Date().toISOString().split('T')[0];
            query_btn.data('ds', now);
            query_btn.data('de', now);
            query_btn.click(function(e) { that.queryAndAddMarkers(e); })
            var btn_container = $('<div class="geoquery-btn-container"></div>');
            btn_container.append(daterange_btn)
                         .append(query_btn);
            var header = this._options.container.parent().parent().find('.panel-heading');
            if (header.length > 0) { // add in panel header
                header.append(btn_container);
            } else { // add over the map
                this._options.container.append(btn_container);
            }
            this.drPicker = daterange_btn.dateRangePicker(dp_options);
            this.drPicker.bind('datepicker-apply',function(event, obj) {
                let ds = new Date(obj.date1.getUTCFullYear(), obj.date1.getUTCMonth(), obj.date1.getUTCDate()).toISOString().split('T')[0];
                let de = new Date(obj.date2.getUTCFullYear(), obj.date2.getUTCMonth(), obj.date2.getUTCDate()).toISOString().split('T')[0];
                query_btn.data('ds', ds);
                query_btn.data('de', de);
                query_btn.attr('disabled', false);
            });

            this.myOpenStreetMap.on('move', function(e) { that.updateRadius(e); })
        };

        Geoquery.prototype = {
            constructor: Geoquery,

            validateOptions: function(options) {
                var o = options;

                if (o.endpoint === undefined || typeof o.endpoint != 'string') {
                    throw "Worldmap must have a valid endpoint";
                }

                if (o.container === undefined) {
                    throw "Worldmap must have a container";
                } else {
                    o.container = o.container instanceof jQuery ? o.container : $('#'+o.container);
                }
            },

            getScale: function(zoom) {
                return 64 * Math.pow(2, (18-zoom));
            },

            updateRadius: function(e) {
                let curObj = e.target;
                let curCoord = curObj.getCenter();
                let zoom = curObj.zoom;
                let scale = this.getScale(this.myOpenStreetMap.getZoom());
                this.circleRadius.setRadius(scale);
                this.circleRadius.setLatLng(curCoord);
            },

            queryAndAddMarkers: function(e) {
                var that = this;
                var radius_km = this.circleRadius.getRadius() / 1000;
                var coord = this.circleRadius._latlng;
                var target = $(e.target);
                var dateStart = target.data('ds');
                var dateEnd = target.data('de');

                $.ajax({
                    url: this._options.endpoint,
                    data: {
                        dateStart: dateStart,
                        dateEnd: dateEnd,
                        lat: coord.lat,
                        lon: coord.lng,
                        radius: radius_km
                    },
                    success: function(allList) {
                        for (var listIndex in allList) {
                            var curMarker = allList[listIndex];
                            var dataText = "";
                            var coordJson = curMarker[1];
                            for (var dataI in curMarker[0]) {
                                var jsonData = JSON.parse(curMarker[0][dataI])
                                dataText += '<strong>'+jsonData.categ+': </strong> '+jsonData.value + "<br>"
                            }
                            var marker = L.marker([coordJson[1], coordJson[0]]).addTo(that.myOpenStreetMap);
                            that.savedMarkers.push(marker);
                            marker.bindPopup(dataText, {autoClose:false}).openPopup();
                        }
                    },
                    error: function(jqXHR, textStatus, errorThrown) {
                        console.log(textStatus+': '+errorThrown);
                    },
                    beforeSend: function() {
                        target.find('.spinner-small').removeClass('hide');
                    },
                    complete: function() {
                        // console.log(jContainer);
                        // remove old markers
                        target.find('.spinner-small').addClass('hide');
                        for (var i in that.savedMarkers) {
                            that.savedMarkers[i].remove();
                        }
                    }
                });
            }

        };

        $.geoquery = Geoquery;
        $.fn.geoquery = function(option) {
            var pickerArgs = arguments;

            return this.each(function() {
                var $this = $(this),
                    inst = $this.data('geoquery'),
                    options = ((typeof option === 'object') ? option : {});
                if ((!inst) && (typeof option !== 'string')) {
                    $this.data('geoquery', new Geoquery(this, options));
                } else {
                    if (typeof option === 'string') {
                        inst[option].apply(inst, Array.prototype.slice.call(pickerArgs, 1));
                    }
                }
            });
        };

        $.fn.geoquery.constructor = Geoquery;

    }));

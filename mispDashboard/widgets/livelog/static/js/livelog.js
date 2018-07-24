(function(factory) {
        "use strict";
        if (typeof define === 'function' && define.amd) {
            define(['jquery'], factory);
        } else if (window.jQuery && !window.jQuery.fn.Livelog) {
            factory(window.jQuery);
        }
    }
    (function($) {
        'use strict';

        // Livelog object
        var Livelog = function(container, options) {
            this._default_options = {
                pollingFrequency: 5000,
                maxTableEntries: 20,
                tableHeader: undefined,
                tableMaxEntries: undefined,
            }

            options.container = container;

            this.validateOptions(options);
            this._options = $.extend({}, this._default_options, options);

            // create table and draw header
            var tableOptions = {
                dom: "<'row'<'col-sm-12'<'dt-toolbar-led'>>>"
                        + "<'row'<'col-sm-12'tr>>"
                        + "<'row'<'col-sm-5'i><'col-sm-7'p>>",
                searching: false,
                scrollY:        this._options.container.parent().height()-45-28,
                scrollCollapse: true,
                paging:         false,
                "order": [[ 0, "desc" ]],
                columnDefs: [
                    { targets: 0, orderable: false },
                    { targets: '_all', searchable: false, orderable: false }
                ]
            };
            var DOMTable = $('<table class="table table-striped table-bordered" style="width:100%"><thead></thead></table>').appendTo(this._options.container);
            var tr = $('<tr></tr>');
            this._options.tableHeader.forEach(function(field) {
                var th = $('<th>'+field+'</th>');
                tr.append(th);
            });
            DOMTable.find('thead').append(tr);
            this.dt = DOMTable.DataTable(tableOptions);

            this.fetch_predata();

            // add status led
            this._ev_timer = null;
            this._ev_retry_frequency = this._options.pollingFrequency; // sec
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
                // this._options.container.append(led_container);
                led.css('display', 'inline-block');
                led_container.append($('<span>Status</span>')).css('float', 'left');
                $('.dt-toolbar-led').append(led_container)
            }
            this.data_source;

            this.connect_to_data_source();
        };

        Livelog.prototype = {
            constructor: Livelog,

            validateOptions: function(options) {
                var o = options;

                if (o.endpoint === undefined || typeof o.endpoint != 'string') {
                    throw "Livelog must have a valid endpoint";
                }

                if (o.container === undefined) {
                    throw "Livelog must have a container";
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

                if (o.tableHeader === undefined || !Array.isArray(o.tableHeader)) {
                    throw "Livelog must have a valid header";
                }

                if (o.tableMaxEntries !== undefined) {
                    o.tableMaxEntries = parseInt(o.tableMaxEntries);
                }
            },

            fetch_predata: function() {
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
                                that.add_entry(j);
                            });
                        }, function() { // fail
                        }
                    );
                }
            },

            connect_to_data_source: function() {
                var that = this;
                if (!this.data_source) {
                    // var url_param = $.param( this.additionalOptions );
                    this.data_source = new EventSource(this._options.endpoint);
                    this.data_source.onmessage = function(event) {
                        var json = jQuery.parseJSON( event.data );
                        that.add_entry(json);
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

            add_entry: function(entry) {
                this.dt.row.add(entry).draw( false );
                // remove entries
                let numRows = this.dt.rows().count();
                let rowsToRemove = numRows - this._options.tableMaxEntries;
                if (rowsToRemove > 0 && this._options.tableMaxEntries != -1) {
                    //get row indexes as an array
                    let arraySlice = this.dt.rows().indexes().toArray();
                    //get row indexes to remove starting at row 0
                    arraySlice = arraySlice.slice(-rowsToRemove);
                    //remove the rows and redraw the table
                    var rows = this.dt.rows(arraySlice).remove().draw();
                }
            },

        };

        $.livelog = Livelog;
        $.fn.livelog = function(option) {
            var pickerArgs = arguments;

            return this.each(function() {
                var $this = $(this),
                    inst = $this.data('livelog'),
                    options = ((typeof option === 'object') ? option : {});
                if ((!inst) && (typeof option !== 'string')) {
                    $this.data('livelog', new Livelog(this, options));
                } else {
                    if (typeof option === 'string') {
                        inst[option].apply(inst, Array.prototype.slice.call(pickerArgs, 1));
                    }
                }
            });
        };

        $.fn.livelog.constructor = Livelog;

    }));

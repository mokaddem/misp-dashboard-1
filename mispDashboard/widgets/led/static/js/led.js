(function(factory) {
        "use strict";
        if (typeof define === 'function' && define.amd) {
            define(['jquery'], factory);
        } else if (window.jQuery && !window.jQuery.fn.Led) {
            factory(window.jQuery);
        }
    }
    (function($) {
        'use strict';

        // Led object
        var Led = function(container, options) {
            this._default_options = {
                pollingFrequency: 3000,
                stateDownThreshold: 15000,
            }

            options.container = container;

            this.validateOptions(options);
            this._options = $.extend({}, this._default_options, options);
            this._ledDOM;

            this.addNewHTMLLed();
            this.fetchState(this, this.updateState);
            this.mainLoop(this);
        };

        Led.prototype = {
            constructor: Led,

            validateOptions: function(options) {
                var o = options;

                if (o.endpoint === undefined || typeof o.endpoint != 'string') {
                    throw "Led must have a valid endpoint";
                }

                if (o.container === undefined) {
                    throw "Led must have a container";
                } else {
                    o.container = o.container instanceof jQuery ? o.container : $('#'+o.container);
                }
            },

            addNewHTMLLed: function() {
                var text = document.createElement('b');
                text.innerHTML = this._options.name;
                var led_div = document.createElement('div');
                var led_container = document.createElement('div');
                led_container.classList.add('led-container');
                led_div.classList.add('led', 'led_red');
                led_container.appendChild(text);
                led_container.appendChild(led_div);
                this._ledDOM = $(led_div);
                this._options.container.append(led_container);
            },

            fetchState: function(that, callback) {
                $.ajax({
                    dataType: "json",
                    url: this._options.endpoint,
                    data: this._options.additionalOptions,
                    success: function(data) {
                        callback(that, data);
                    },
                    error: function(jqXHR, textStatus, errorThrown) {
                        callback(that, {last_keepalive: false});
                    }
                });
            },

            // state_object == {last_keepalive: timestamp|false}
            updateState: function(that, state_object) {
                var last_keepalive = state_object.last_keepalive;
                var time_diff = Math.abs(new Date().getTime()/1000 - last_keepalive);

                if (last_keepalive === false) {
                    that.updateDOMState(that, 'not connected');
                } else if (time_diff <= that._options.stateDownThreshold) {
                    that.updateDOMState(that, 'up');
                } else if (time_diff > that._options.stateDownThreshold) {
                    that.updateDOMState(that, 'down');
                } else {
                    that.updateDOMState(that, 'not connected');
                }
            },

            updateDOMState: function(that, state) {
                switch (state) {
                    case 'up':
                        that._ledDOM.removeClass("led_red");
                        that._ledDOM.removeClass("led_orange");
                        that._ledDOM.addClass("led_green");
                        break;
                    case 'down':
                        that._ledDOM.removeClass("led_red");
                        that._ledDOM.removeClass("led_green");
                        that._ledDOM.addClass("led_orange");
                        break;
                    case 'not connected':
                        that._ledDOM.removeClass("led_green");
                        that._ledDOM.removeClass("led_orange");
                        that._ledDOM.addClass("led_red");
                        break;
                    default:
                        that._ledDOM.removeClass("led_green");
                        that._ledDOM.removeClass("led_orange");
                        that._ledDOM.addClass("led_red");
                }
            },

            mainLoop: function(that) {
                setInterval(function (self) {
                    that.fetchState(that, that.updateState)
                }, this._options.pollingFrequency);
            }
        };

        $.led = Led;
        $.fn.led = function(option) {
            var pickerArgs = arguments;

            return this.each(function() {
                var $this = $(this),
                    inst = $this.data('led'),
                    options = ((typeof option === 'object') ? option : {});
                if ((!inst) && (typeof option !== 'string')) {
                    $this.data('led', new Led(this, options));
                } else {
                    if (typeof option === 'string') {
                        inst[option].apply(inst, Array.prototype.slice.call(pickerArgs, 1));
                    }
                }
            });
        };

        $.fn.led.constructor = Led;

    }));

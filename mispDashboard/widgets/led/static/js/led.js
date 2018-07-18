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
            this.POLLING_FREQUENCY = 3000; // 3s
            this.STATE_DOWN_THRESHOLD = 15000; // 15s

            options.container = container;

            this._options = {};
            this.parseOptions(options)
            this._ledDOM;

            this.addNewHTMLLed();
            this.fetchState(this, this.updateState);
            this.mainLoop(this);
        };

        Led.prototype = {
            constructor: Led,

            parseOptions: function(options) {
                var _o = this._options;
                var o = options;

                if (o.endpoint !== undefined && typeof o.endpoint == 'string') {
                    _o.endpoint = o.endpoint;
                } else {
                    throw "Led must have a valid endpoint";
                }

                _o.pollingFrequency = o.pollingFrequency !== undefined ? o.pollingFrequency*1000 : this.POLLING_FREQUENCY;
                _o.stateDownThreshold = o.stateDownThreshold !== undefined ? o.stateDownThreshold*1000 : this.STATE_DOWN_THRESHOLD;
                _o.name = o.name !== undefined ? o.name : "unnamed led";

                if (o.container !== undefined) {
                    _o.container = o.container instanceof jQuery ? o.container : $('#'+o.container);
                } else {
                    throw "Led must have a container";
                }

                _o.additionalOptions = o.additionalOptions;

                return _o;
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

        // /* TYPEAHEAD PLUGIN DEFINITION
        // * ============================ */
        //
        // var old = $.fn.Led;
        //
        // $.fn.Led = function (option) {
        //     var arg = arguments;
        //     if (typeof option == 'string' && option == 'getActive') {
        //         return this.data('active');
        //     }
        //     return this.each(function () {
        //         var $this = $(this);
        //         var data = $this.data('Led');
        //         var options = typeof option == 'object' && option;
        //         if (!data) $this.data('Led', (data = new Led(this, options)));
        //         if (typeof option == 'string' && data[option]) {
        //             if (arg.length > 1) {
        //                 data[option].apply(data, Array.prototype.slice.call(arg, 1));
        //             } else {
        //                 data[option]();
        //             }
        //         }
        //     });
        // };
        //
        // $.fn.Led.Constructor = Led;
        //
        // /* TYPEAHEAD NO CONFLICT
        // * =================== */
        //
        // $.fn.Led.noConflict = function () {
        //   $.fn.Led = old;
        //   return this;
//         };
//
// }));


/*
var Led = function(container, options) {
    this.parseOptions = function(options) {
        var _o = this._options;
        var o = options;

        if (o.endpoint !== undefined && typeof o.endpoint == 'string') {
            _o.endpoint = o.endpoint;
        } else {
            throw "Led must have a valid endpoint";
        }

        _o.pollingFrequency = o.pollingFrequency !== undefined ? o.pollingFrequency*1000 : this.POLLING_FREQUENCY;
        _o.stateDownThreshold = o.stateDownThreshold !== undefined ? o.stateDownThreshold*1000 : this.STATE_DOWN_THRESHOLD;
        _o.name = o.name !== undefined ? o.name : "unnamed led";

        if (o.container !== undefined) {
            _o.container = o.container instanceof jQuery ? o.container : $('#'+o.container);
        } else {
            throw "Led must have a container";
        }

        _o.additionalOptions = o.additionalOptions;

        return _o;
    };

    this.addNewHTMLLed = function() {
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
    };

    this.fetchState = function(that, callback) {
        $.ajax({
            dataType: "json",
            url: this._options.endpoint,
            data: this._options.additionalOptions,
            success: function(data) {
                callback(that, data);
            },
            error: function(jqXHR, textStatus, errorThrown) {
                console.log(textStatus);
                callback(that, {last_keepalive: false});
            }
        });
    };

    // state_object == {last_keepalive: timestamp|false}
    this.updateState = function(that, state_object) {
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
    };

    this.updateDOMState = function(that, state) {
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
    };

    this.mainLoop = function(that) {
        setInterval(function (self) {
            that.fetchState(that, that.updateState)
        }, this._options.pollingFrequency);
    };


    this.POLLING_FREQUENCY = 3000; // 3s
    this.STATE_DOWN_THRESHOLD = 15000; // 15s

    options.container = container;

    this._options = {};
    this.parseOptions(options)
    this._ledDOM;

    this.addNewHTMLLed();
    this.fetchState(this, this.updateState);
    this.mainLoop(this);
};
*/

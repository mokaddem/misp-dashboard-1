(function(factory) {
        "use strict";
        if (typeof define === 'function' && define.amd) {
            define(['jquery'], factory);
        } else if (window.jQuery && !window.jQuery.fn.Punchcard_widget) {
            factory(window.jQuery);
        }
    }
    (function($) {
        'use strict';

        // punchcard object
        var Punchcard_widget = function (container, options) {
            this._default_options = {
                singular: 'loging',
                plural: 'logins'
            }

            options.container = container;
            this.myPunchcard;

            this.validateOptions(options);
            this._options = $.extend({}, this._default_options, options);

            var that = this;
            this.fetchState(function(data) {
                that.myPunchcard = that._options.container.punchcard({
                    data: data,
                    days: [
                        "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
                    ],
                    responsive: false,
                    singular: that._options.singular,
                    plural: that._options.plural,
                    timezones: ['local'],
                    timezoneIndex:0,
                    responsive: that._options.responsive
                });
            })
        };

        Punchcard_widget.prototype = {
            constructor: Punchcard_widget,

            validateOptions: function(options) {
                var o = options;

                if (o.endpoint === undefined || typeof o.endpoint != 'string') {
                    throw "Punchcard must have a valid endpoint";
                }

                if (o.container === undefined) {
                    throw "Punchcard must have a container";
                } else {
                    o.container = o.container instanceof jQuery ? o.container : $('#'+o.container);
                }
            },

            fetchState: function(callback) {
                var that = this;
                $.ajax({
                    dataType: "json",
                    url: this._options.endpoint,
                    data: this._options.additionalOptions,
                    success: function(data) {
                        callback(data);
                    },
                    error: function(jqXHR, textStatus, errorThrown) {
                        callback([]);
                    }
                });
            },

        }

        $.punchcard_widget = Punchcard_widget;
        $.fn.punchcard_widget = function(option) {
            var pickerArgs = arguments;

            return this.each(function() {
                var $this = $(this),
                    inst = $this.data('punchcard_widget'),
                    options = ((typeof option === 'object') ? option : {});
                if ((!inst) && (typeof option !== 'string')) {
                    $this.data('punchcard_widget', new Punchcard_widget(this, options));
                } else {
                    if (typeof option === 'string') {
                        inst[option].apply(inst, Array.prototype.slice.call(pickerArgs, 1));
                    }
                }
            });
        };

        $.fn.punchcard_widget.constructor = Punchcard_widget;

    }));

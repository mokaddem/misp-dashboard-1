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
            this.POLLING_FREQUENCY = 3000; // 3s

            options.container = container;

            this._options = {};
            this.parseOptions(options)

        };

        Livelog.prototype = {
            constructor: Livelog,

            parseOptions: function(options) {
                var _o = this._options;
                var o = options;

                if (o.endpoint !== undefined && typeof o.endpoint == 'string') {
                    _o.endpoint = o.endpoint;
                } else {
                    throw "Livelog must have a valid endpoint";
                }

                _o.pollingFrequency = o.pollingFrequency !== undefined ? o.pollingFrequency*1000 : this.POLLING_FREQUENCY;
                _o.name = o.name !== undefined ? o.name : "unnamed livelog";

                if (o.container !== undefined) {
                    _o.container = o.container instanceof jQuery ? o.container : $('#'+o.container);
                } else {
                    throw "Livelog must have a container";
                }

                _o.additionalOptions = o.additionalOptions;

                return _o;
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

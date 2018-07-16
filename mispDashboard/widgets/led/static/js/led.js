class Led {
    constructor(container, options) {
        this.POLLING_FREQUENCY = 3000; // 3s
        this.STATE_DOWN_THRESHOLD = 15000; // 15s

        options.container = container;

        this._options = {};
        this.parseOptions(options)
        this._ledDOM;

        this.addNewHTMLLed();
        this.fetchState(this, this.updateState)
        this.mainLoop(this);
    }

    parseOptions(options) {
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
    }

    addNewHTMLLed() {
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
    }

    fetchState(that, callback) {
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
    }

    // state_object == {last_keepalive: timestamp|false}
    updateState(that, state_object) {
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
    }

    updateDOMState(that, state) {
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
    }

    mainLoop(that) {
        setInterval(function (self) {
            that.fetchState(that, that.updateState)
        }, this._options.pollingFrequency);
    }
}


/*
class LedManager {
    constructor(options) { // options == [{led1:options}, {led2:options}]
        this._options = [];
        this.parseOptions(options)
        this._ledsTimeout = setTimeout(function(){ ledmanager.manageColors(); }, this._options.frequencyCheck);
        this._ledKeepAlive = {};
        this._allLedName = [];
        this._ledNum = 0;
        this._nameToNumMapping = {}; //avoid bad ID if zmqname contains spaces
    }

    parseOptions(options) {
        for (var o of options) {
            this._options = parseOption(o);
        }
    }

    parseOption(option) {
        var _o = {};
        var o = option;

        if (o.endpoints !== undefined) {
            if (Array.isArray(o.endpoints)) {
                _o.endpoints = o.endpoints;
            } else if (typeof o.endpoints == 'string') {
                _o.endpoints = [o.endpoints];
            } else {
                throw "Led have an invalid endpoint";
            }
        } else {
            throw "Led must have an endpoint";
        }

        if (o.frequencyCheck !== undefined) {
            _o.frequencyCheck = o.frequencyCheck;
        } else {
            _o.frequencyCheck = FREQUENCY_CHECK;
        }

        if (o.name !== undefined) {
            _o.name = o.name;
        } else {
            _o.name = "unnamed led";
        }

        return _o;
    }

    add_new_led(zmqname) {
        this._allLedName.push(zmqname);
        this._nameToNumMapping[zmqname] = this._ledNum;
        this._ledNum += 1;
        this.add_new_html_led(zmqname);
        this._ledKeepAlive[zmqname] = new Date().getTime();
    }

    add_new_html_led(zmqname) {
        var ID = this._nameToNumMapping[zmqname]
        var text = document.createElement('b');
        text.innerHTML = zmqname;
        var div = document.createElement('DIV');
        div.id = "status_led_"+ID;
        div.classList.add("led_green");
        var sepa = document.createElement('DIV');
        sepa.classList.add("leftSepa");
        sepa.classList.add("textTopHeader");
        sepa.appendChild(text);
        sepa.appendChild(div);
        $('#ledsHolder').append(sepa);
    }

    updateKeepAlive(zmqname) {
        if (this._allLedName.indexOf(zmqname) == -1) {
            this.add_new_led(zmqname);
        }
        this._ledKeepAlive[zmqname] = new Date().getTime();
        this.resetTimeoutAndRestart(zmqname);
    }

    resetTimeoutAndRestart(zmqName) {
        clearTimeout(this._ledsTimeout); //cancel current leds timeout
        this.manageColors();
    }

    manageColors() {
        for (var feed in this._ledKeepAlive) {
            var feedID = this._nameToNumMapping[feed];
            var htmlLed = $("#status_led_"+feedID);
            if(new Date().getTime() - this._ledKeepAlive[feed] > frequencyCheck) { // no feed
                htmlLed.removeClass("led_green");
                htmlLed.addClass("led_red");
            } else {
                htmlLed.removeClass("led_red");
                htmlLed.addClass("led_green");
            }
        }
        this._ledsTimeout = setTimeout(function(){ ledmanager.manageColors(); }, frequencyCheck);
    }

}
*/

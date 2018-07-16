#!/usr/bin/env python3
from flask import Flask, url_for, jsonify
from mispDashboard import app
import configparser
import os


configfile = os.path.join(
    os.path.dirname(
        os.path.realpath(__file__)
    ),
    'config/config.cfg')
cfg = configparser.ConfigParser()
cfg.read(configfile)

server_host = cfg.get("Server", "host")
server_port = cfg.getint("Server", "port")

def has_no_empty_params(rule):
    defaults = rule.defaults if rule.defaults is not None else ()
    arguments = rule.arguments if rule.arguments is not None else ()
    return len(defaults) >= len(arguments)


@app.route("/site-map")
def site_map():
    links = []
    for rule in app.url_map.iter_rules():
        # Filter out rules we can't navigate to in a browser
        # and rules that require parameters
        if "GET" in rule.methods and has_no_empty_params(rule):
            url = url_for(rule.endpoint, **(rule.defaults or {}))
            links.append((url, rule.endpoint))
    links.append(['%s' % rule for rule in app.url_map.iter_rules()])
    return jsonify(links)

if __name__ == '__main__':
    app.run(host=server_host, port=server_port, threaded=True)

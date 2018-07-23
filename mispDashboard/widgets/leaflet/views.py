#!/usr/bin/env python3
from . import leaflet
from flask import Flask, render_template, request, Response, jsonify
from mispDashboard.util import generateWidgetConfig
from flask_cors import cross_origin


@cross_origin()
@leaflet.route("/")
def leaflet():
    kargs = {}
    for k, v in request.args.items():
        if k == 'endpoint':
            continue
        kargs[k] = v
    endpoint = request.args.get('endpoint')

    return render_template('leaflet.html',
            widgetsConfig=generateWidgetConfig('leaflet', endpoint, **kargs),
            js_deps=[],
            css_deps=[],
            )

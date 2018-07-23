#!/usr/bin/env python3
from . import map
from flask import Flask, render_template, request, Response, jsonify
from mispDashboard.util import generateWidgetConfig
from flask_cors import cross_origin


@cross_origin()
@map.route("/")
def map():
    kargs = {}
    for k, v in request.args.items():
        if k == 'endpoint':
            continue
        kargs[k] = v
    endpoint = request.args.get('endpoint')

    return render_template('map.html',
            widgetsConfig=generateWidgetConfig('map', endpoint, **kargs),
            js_deps=[],
            css_deps=[],
            )

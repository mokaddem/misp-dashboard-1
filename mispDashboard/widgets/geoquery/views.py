#!/usr/bin/env python3
from . import geoquery
from flask import Flask, render_template, request, Response, jsonify
from mispDashboard.util import generateWidgetConfig


"""Options:
Required:
    - endpoint
    - container

Optional:
    - circleColor
    - osmurl
"""
@geoquery.route("/")
def geoquery():
    kargs = {}
    for k, v in request.args.items():
        if k == 'endpoint':
            continue
        kargs[k] = v
    endpoint = request.args.get('endpoint')

    return render_template('geoquery.html',
            widgetsConfig=generateWidgetConfig('geoquery', endpoint, **kargs),
            js_deps=[],
            css_deps=[],
            )

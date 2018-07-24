#!/usr/bin/env python3
from . import led
from flask import Flask, render_template, request, Response, jsonify
from mispDashboard.util import generateWidgetConfig


"""Options:
Required:
    - endpoint
    - container

Optional:
    - pollingFrequency: 3000 // ms
    - stateDownThreshold: 15000 // ms
"""
@led.route("/")
def led():
    kargs = {}
    for k, v in request.args.items():
        if k == 'endpoint':
            continue
        kargs[k] = v
    endpoint = request.args.get('endpoint')

    return render_template('led.html',
            widgetsConfig=generateWidgetConfig('led', endpoint, **kargs),
            js_deps=[],
            css_deps=[],
            )

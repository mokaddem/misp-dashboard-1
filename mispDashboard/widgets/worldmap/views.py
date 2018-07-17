#!/usr/bin/env python3
from . import worldmap
from flask import Flask, render_template, request, Response, jsonify
from mispDashboard.util import generateWidgetConfig


@worldmap.route("/")
def worldmap():
    kargs = {}
    for k, v in request.args.items():
        if k == 'endpoint':
            continue
        kargs[k] = v
    endpoint = request.args.get('endpoint')

    return render_template('worldmap.html',
            widgetsConfig=generateWidgetConfig('worldmap', endpoint, **kargs),
            js_deps=[],
            css_deps=[],
            )

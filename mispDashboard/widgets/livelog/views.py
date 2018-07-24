#!/usr/bin/env python3
from . import livelog
from flask import Flask, render_template, request, Response, jsonify
from mispDashboard.util import generateWidgetConfig


"""Options:
Required:
    - endpoint
    - container

Optional:
    - preData
    - pollingFrequency // ms
    - maxTableEntries
    - tableHeader
    - tableMaxEntries
"""
@livelog.route("/")
def livelog():
    kargs = {}
    for k, v in request.args.items():
        if k == 'endpoint':
            continue
        if k == 'tableHeader[]':
            kargs['tableHeader'] = request.args.getlist('tableHeader[]')
            continue
        kargs[k] = v
    endpoint = request.args.get('endpoint')

    return render_template('livelog.html',
            widgetsConfig=generateWidgetConfig('livelog', endpoint, **kargs),
            js_deps=[],
            css_deps=[],
            )

#!/usr/bin/env python3
from . import livelog
from flask import Flask, render_template, request, Response, jsonify
from mispDashboard.util import generateWidgetConfig


@livelog.route("/")
def livelog():
    kargs = {}
    for k, v in request.args.items():
        if k == 'endpoint':
            continue
        kargs[k] = v
    endpoint = request.args.get('endpoint')

    return render_template('livelog.html',
            widgetsConfig=generateWidgetConfig('livelog', endpoint, **kargs),
            js_deps=[],
            css_deps=[],
            )

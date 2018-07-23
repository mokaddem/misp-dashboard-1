#!/usr/bin/env python3
from . import punchcard
from flask import Flask, render_template, request, Response, jsonify
from mispDashboard.util import generateWidgetConfig


@punchcard.route("/")
def punchcard():
    kargs = {}
    for k, v in request.args.items():
        if k == 'endpoint':
            continue
        kargs[k] = v
    endpoint = request.args.get('endpoint')

    return render_template('punchcard_widget.html',
            widgetsConfig=generateWidgetConfig('punchcard', endpoint, **kargs),
            js_deps=[],
            css_deps=[],
            )

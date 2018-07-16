#!/usr/bin/env python3
from . import widgets
from flask import Flask, render_template, request, Response, jsonify
from mispDashboard.util import generateWidgetConfig


@widgets.route("/widget/")
def widget(type):
    endpoint = request.args.get('endpoint')
    name = request.args.get('name')

    return render_template('widget.html',
            widgetsConfig=generateWidgetConfig(type, endpoint, name=name),
            js_deps=[],
            css_deps=[],
            )

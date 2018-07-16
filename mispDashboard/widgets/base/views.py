#!/usr/bin/env python3
from . import baseWidget
from flask import Flask, render_template, request, Response, jsonify
from mispDashboard.util import generateWidgetConfig


@baseWidget.route("/")
def base():
    endpoint = request.args.get('endpoint')
    name = request.args.get('name')

    return render_template('base_widget.html',
            widgetsConfig=generateWidgetConfig('base', endpoint, name=name),
            js_deps=[],
            css_deps=[],
            )

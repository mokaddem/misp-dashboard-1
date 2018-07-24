#!/usr/bin/env python3
from . import live
from flask import Flask, render_template, request, Response, jsonify
from mispDashboard.util import generateWidgetConfig


@live.route("/")
def index():
    return render_template('index.html',
            widgetsConfig={
                'live_led': generateWidgetConfig('led', 'http://localhost:5004/led', name='Status led', pollingFrequency=2),
                'live_widget1': generateWidgetConfig('map', 'http://localhost:5004/maps_stream', name='Live map',
                    preData='http://localhost:5004/maps', zoomLevel=3),
                'live_widget2': generateWidgetConfig('worldmap', 'http://localhost:5004/maps_stream2', name='World map',
                    preData='http://localhost:5004/maps'),
                # 'live_widget3': generateWidgetConfig('linechart', 'http://localhost:5004/line', name='Occurences'),
                # 'live_widget2': generateWidgetConfig('led', 'http://localhost:5004/led', name='Status led', pollingFrequency=2),
                'live_widget3': generateWidgetConfig('punchcard', 'http://localhost:5004/punchcard', name='Custom', pollingFrequency=2),
                'live_widget4': generateWidgetConfig('livelog', 'http://localhost:5004/logs_stream', name='Live log',
                    preData='http://localhost:5004/logs', tableHeader=['timestamp', 'name', 'value', 'tag'], tableMaxEntries=10)
            })
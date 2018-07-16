from flask import Flask
from .live import live
from .widgets.base import baseWidget
from .widgets.led import led
from .widgets.leaflet import leaflet

app = Flask(__name__)

# Register blueprints
app.register_blueprint(live)
app.register_blueprint(baseWidget, url_prefix='/widget/base')
app.register_blueprint(led, url_prefix='/widget/led')
app.register_blueprint(leaflet, url_prefix='/widget/leaflet')

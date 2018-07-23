from flask import Flask
from flask_cors import CORS
from .live import live
from .widgets.base import baseWidget
from .widgets.led import led
from .widgets.leaflet import leaflet
from .widgets.geoquery import geoquery
from .widgets.worldmap import worldmap
from .widgets.livelog import livelog
from .widgets.punchcard import punchcard

app = Flask(__name__)
CORS(app)

# Register blueprints
app.register_blueprint(live)
app.register_blueprint(baseWidget, url_prefix='/widget/base')
app.register_blueprint(led, url_prefix='/widget/led')
app.register_blueprint(leaflet, url_prefix='/widget/leaflet')
app.register_blueprint(geoquery, url_prefix='/widget/geoquery')
app.register_blueprint(worldmap, url_prefix='/widget/worldmap')
app.register_blueprint(livelog, url_prefix='/widget/livelog')
app.register_blueprint(punchcard, url_prefix='/widget/punchcard')

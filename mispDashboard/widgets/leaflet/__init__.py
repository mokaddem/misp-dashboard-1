from flask import Blueprint

leaflet = Blueprint(
    'leaflet',
    __name__,
    template_folder='templates',
    static_folder='static',
)

from . import views

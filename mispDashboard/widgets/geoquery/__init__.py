from flask import Blueprint

geoquery = Blueprint(
    'geoquery',
    __name__,
    template_folder='templates',
    static_folder='static',
)

from . import views

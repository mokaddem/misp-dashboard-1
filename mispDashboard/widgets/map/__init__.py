from flask import Blueprint

map = Blueprint(
    'map',
    __name__,
    template_folder='templates',
    static_folder='static',
)

from . import views

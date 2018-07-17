from flask import Blueprint

worldmap = Blueprint(
    'worldmap',
    __name__,
    template_folder='templates',
    static_folder='static',
)

from . import views

from flask import Blueprint

led = Blueprint(
    'led',
    __name__,
    template_folder='templates',
    static_folder='static',
)

from . import views

from flask import Blueprint

live = Blueprint(
    'live',
    __name__,
    template_folder='templates',
    static_folder='static',
)

from . import views

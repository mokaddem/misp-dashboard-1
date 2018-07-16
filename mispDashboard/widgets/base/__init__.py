from flask import Blueprint

baseWidget = Blueprint(
    'baseWidget',
    __name__,
    template_folder='templates',
    static_folder='static',
)

from . import views

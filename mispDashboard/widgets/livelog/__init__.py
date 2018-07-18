from flask import Blueprint

livelog = Blueprint(
    'livelog',
    __name__,
    template_folder='templates',
    static_folder='static',
)

from . import views

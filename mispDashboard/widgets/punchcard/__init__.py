from flask import Blueprint

punchcard = Blueprint(
    'punchcard',
    __name__,
    template_folder='templates',
    static_folder='static',
)

from . import views

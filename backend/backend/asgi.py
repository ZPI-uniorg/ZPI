"""
ASGI config for backend project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

import os

from socket_server import app as socket_app

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")

application = socket_app

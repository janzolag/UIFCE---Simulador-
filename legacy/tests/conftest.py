import os
import sys
import threading

import pytest

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, RAIZ)
os.chdir(RAIZ)


@pytest.fixture(scope="session")
def app_demo():
    from app import crear_app
    return crear_app(modo_demo=True)


@pytest.fixture(scope="session")
def cliente(app_demo):
    return app_demo.server.test_client()


@pytest.fixture(scope="session")
def servidor(app_demo):
    """Levanta la app real en un hilo para las pruebas con navegador."""
    from werkzeug.serving import make_server
    srv = make_server("127.0.0.1", 8765, app_demo.server, threaded=True)
    hilo = threading.Thread(target=srv.serve_forever, daemon=True)
    hilo.start()
    yield "http://127.0.0.1:8765"
    srv.shutdown()

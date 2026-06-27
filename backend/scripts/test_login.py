import importlib, os, sys, traceback
sys.path.insert(0, '.')
sys.path.insert(0, 'backend')

try:
    server = importlib.import_module('server')
except Exception:
    traceback.print_exc()
    raise

from fastapi.testclient import TestClient
client = TestClient(server.app)

# use admin credentials from .env if present
from dotenv import load_dotenv
load_dotenv('../backend/.env')
admin_email = os.environ.get('ADMIN_EMAIL', 'admin@gymtracker.com')
admin_password = os.environ.get('ADMIN_PASSWORD', 'admin123')

try:
    resp = client.post('/api/auth/login', json={'email': admin_email, 'password': admin_password})
    print('STATUS', resp.status_code)
    print('BODY', resp.text)
except Exception:
    traceback.print_exc()

import importlib, os, sys, uuid, traceback
sys.path.insert(0, '.')
sys.path.insert(0, 'backend')

# Ensure dotenv in backend is loaded by importing server normally
try:
    server = importlib.import_module('server')
except Exception:
    traceback.print_exc()
    raise

from fastapi.testclient import TestClient

client = TestClient(server.app)
email = f'test+{uuid.uuid4().hex[:8]}@example.com'
payload = {'name':'Test User','email': email, 'password': 'password123'}

try:
    resp = client.post('/api/auth/register', json=payload)
    print('STATUS', resp.status_code)
    print('BODY', resp.text)
except Exception:
    traceback.print_exc()

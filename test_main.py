from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_register_client():
    response = client.post(
        "/auth/register",
        json={
            "email": "testuser@example.com",
            "password": "password123",
            "name": "Тестовый Клиент",
            "phone": "+79991112233"
        }
    )
    assert response.status_code in [201, 400]

def test_protected_route_without_token():
    response = client.get("/cars")
    assert response.status_code == 401
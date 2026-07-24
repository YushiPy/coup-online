from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_read_root():
    response = client.get("/")
    assert response.status_code == 200


def test_read_lobby():
    response = client.get("/lobby")
    assert response.status_code == 200


def test_read_game():
    response = client.get("/game")
    assert response.status_code == 200


def test_favicon():
    response = client.get("/favicon.ico")
    assert response.status_code == 200

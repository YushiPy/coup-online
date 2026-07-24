import pytest
from fastapi import WebSocketDisconnect
from starlette.testclient import WebSocketDenialResponse


@pytest.mark.parametrize(
    "req_type",
    [
        "set_ready",
        "update_settings",
        "promote_host",
        "kick_player",
        "ping_unready",
        "start_match",
    ],
)
def test_match_websocket(client, req_type, test_player, test_public_match):

    response = client.post(
        "/api/auth/login",
        json={"username": test_player.username, "password": test_player.password},
    )

    assert response.status_code == 200

    response = client.post(f"/api/matches/{test_public_match.id}/join")

    assert response.status_code == 200

    with client.websocket_connect(
        f"/api/ws/matches/{test_public_match.id}"
    ) as websocket:
        websocket.send_json({"type": req_type})
        websocket.receive_json()
        data = websocket.receive_json()

        assert data is not None


def test_match_websocket_invalid(client, test_public_match):

    with pytest.raises(WebSocketDenialResponse) as exception_info:
        with client.websocket_connect(f"/api/ws/matches/{test_public_match.id}"):
            pass

    assert exception_info.value.status_code == 401


def test_lobby_websocket(client, test_player):

    response = client.post(
        "/api/auth/login",
        json={"username": test_player.username, "password": test_player.password},
    )

    assert response.status_code == 200

    with client.websocket_connect(f"/api/ws/lobby"):
        pass


def test_lobby_websocket_invalid(client):

    with pytest.raises(WebSocketDenialResponse) as exception_info:
        with client.websocket_connect(f"/api/ws/lobby"):
            pass

    assert exception_info.value.status_code == 401

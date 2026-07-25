from backend.models.player import Player


def test_get_friends(session, client):

    player1 = Player(username="player1", password="")
    player2 = Player(username="player2", password="", displayname="Player 2")
    player3 = Player(username="player3", password="", displayname="Player 3")

    session.add_all([player1, player2, player3])
    session.commit()
    session.refresh(player1)
    session.refresh(player2)
    session.refresh(player3)

    player1.friends.append(player2)
    player1.friends.append(player3)

    response = client.post(
        "/api/auth/login",
        json={"username": player1.username, "password": player1.password},
    )

    assert response.status_code == 200

    response = client.get("/api/friends")
    data = response.json()

    assert response.status_code == 200
    assert len(data) == 2

    friends = {data[i]["username"]: data[i] for i in range(2)}

    assert friends["player2"]["username"] == player2.username
    assert friends["player2"]["displayname"] == player2.displayname
    assert friends["player2"]["status"] == "online"

    assert friends["player3"]["username"] == player3.username
    assert friends["player3"]["displayname"] == player3.displayname
    assert friends["player3"]["status"] == "online"


def test_get_friends_guest(client):

    response = client.get("/api/friends")

    assert response.status_code == 401

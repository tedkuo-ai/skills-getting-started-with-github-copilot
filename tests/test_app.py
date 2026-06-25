import copy
import pytest
from fastapi.testclient import TestClient

from src.app import app, activities


@pytest.fixture(autouse=True)
def reset_activities():
    """Arrange: preserve and restore the in-memory activities between tests."""
    original = copy.deepcopy(activities)
    yield
    activities.clear()
    activities.update(original)


client = TestClient(app)


def test_get_activities():
    # Arrange
    expected_keys = ["Chess Club", "Soccer Team"]

    # Act
    res = client.get("/activities")

    # Assert
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, dict)
    for key in expected_keys:
        assert key in data


def test_signup_and_duplicate():
    # Arrange
    email = "tester@example.com"
    activity_name = "Chess Club"
    assert all(p.lower() != email for p in activities[activity_name]["participants"])

    # Act: first signup
    res = client.post(f"/activities/{activity_name}/signup?email={email}")

    # Assert: successful signup
    assert res.status_code == 200
    assert f"Signed up {email}" in res.json().get("message", "")

    # Act: duplicate signup
    res2 = client.post(f"/activities/{activity_name}/signup?email={email}")

    # Assert: duplicate rejected
    assert res2.status_code == 400


def test_unregister_participant():
    # Arrange
    email = "remove_me@example.com"
    activity_name = "Programming Class"

    # Act: add participant
    r = client.post(f"/activities/{activity_name}/signup?email={email}")
    assert r.status_code == 200

    # Act: remove participant
    r2 = client.delete(f"/activities/{activity_name}/signup?email={email}")

    # Assert
    assert r2.status_code == 200
    assert "Unregistered" in r2.json().get("message", "")


def test_invalid_email():
    # Arrange
    invalid = "not-an-email"

    # Act
    res = client.post(f"/activities/Chess%20Club/signup?email={invalid}")

    # Assert
    assert res.status_code == 400


def test_capacity_enforced():
    # Arrange: set small capacity and a full participants list
    activity_name = "Basketball Club"
    backup = copy.deepcopy(activities[activity_name])
    activities[activity_name]["max_participants"] = 1
    activities[activity_name]["participants"] = ["one@mergington.edu"]

    try:
        # Act
        res = client.post(f"/activities/{activity_name}/signup?email=new@mergington.edu")

        # Assert
        assert res.status_code == 400
        assert res.json().get("detail") == "Activity is full"
    finally:
        activities[activity_name] = backup

from copy import deepcopy

import pytest
from fastapi.testclient import TestClient

from src import app as app_module


@pytest.fixture
def api(monkeypatch):
    activities = deepcopy(app_module.activities)
    monkeypatch.setattr(app_module, "activities", activities)
    return TestClient(app_module.app), activities


def test_root_redirects_to_static_index(api):
    # Arrange
    client, _ = api

    # Act
    response = client.get("/", follow_redirects=False)

    # Assert
    assert response.status_code == 307
    assert response.headers["location"] == "/static/index.html"


def test_get_activities_returns_data_without_caching(api):
    # Arrange
    client, activities = api

    # Act
    response = client.get("/activities")

    # Assert
    assert response.status_code == 200
    assert response.json() == activities
    assert response.headers["cache-control"] == "no-store"


def test_signup_adds_student_to_activity(api):
    # Arrange
    client, activities = api
    activity_name = "Chess Club"
    email = "new-student@mergington.edu"

    # Act
    response = client.post(
        f"/activities/{activity_name}/signup",
        params={"email": email},
    )

    # Assert
    assert response.status_code == 200
    assert response.json() == {
        "message": f"Signed up {email} for {activity_name}"
    }
    assert email in activities[activity_name]["participants"]


def test_signup_rejects_duplicate_student(api):
    # Arrange
    client, _ = api
    activity_name = "Chess Club"
    email = "michael@mergington.edu"

    # Act
    response = client.post(
        f"/activities/{activity_name}/signup",
        params={"email": email},
    )

    # Assert
    assert response.status_code == 400
    assert response.json() == {
        "detail": "Student already signed up for this activity"
    }


def test_signup_rejects_unknown_activity(api):
    # Arrange
    client, _ = api

    # Act
    response = client.post(
        "/activities/Unknown%20Activity/signup",
        params={"email": "student@mergington.edu"},
    )

    # Assert
    assert response.status_code == 404
    assert response.json() == {"detail": "Activity not found"}


def test_signup_rejects_missing_email(api):
    # Arrange
    client, _ = api

    # Act
    response = client.post("/activities/Chess%20Club/signup")

    # Assert
    assert response.status_code == 422


def test_signup_rejects_full_activity_without_adding_student(api):
    # Arrange
    client, activities = api
    activity_name = "Chess Club"
    email = "new-student@mergington.edu"
    participants = activities[activity_name]["participants"]
    activities[activity_name]["max_participants"] = len(participants) + 1
    successful_email = "another-student@mergington.edu"

    # Act
    first_response = client.post(
        f"/activities/{activity_name}/signup",
        params={"email": successful_email},
    )
    full_response = client.post(
        f"/activities/{activity_name}/signup",
        params={"email": email},
    )

    # Assert
    assert first_response.status_code == 200
    assert full_response.status_code == 409
    assert full_response.json() == {"detail": "Activity is full"}
    assert email not in participants
    assert len(participants) == activities[activity_name]["max_participants"]


def test_unregister_removes_student_from_activity(api):
    # Arrange
    client, activities = api
    activity_name = "Chess Club"
    email = "michael@mergington.edu"

    # Act
    response = client.delete(
        f"/activities/{activity_name}/signup",
        params={"email": email},
    )

    # Assert
    assert response.status_code == 200
    assert response.json() == {
        "message": f"Unregistered {email} from {activity_name}"
    }
    assert email not in activities[activity_name]["participants"]


def test_unregister_rejects_student_not_signed_up(api):
    # Arrange
    client, _ = api

    # Act
    response = client.delete(
        "/activities/Chess%20Club/signup",
        params={"email": "not-signed-up@mergington.edu"},
    )

    # Assert
    assert response.status_code == 404
    assert response.json() == {
        "detail": "Student is not signed up for this activity"
    }


def test_unregister_rejects_unknown_activity(api):
    # Arrange
    client, _ = api

    # Act
    response = client.delete(
        "/activities/Unknown%20Activity/signup",
        params={"email": "student@mergington.edu"},
    )

    # Assert
    assert response.status_code == 404
    assert response.json() == {"detail": "Activity not found"}

"""
RoadResQ API Test Suite
========================
Automated pytest tests for the RoadResQ Node.js backend.
Uses the `requests` library to send HTTP requests to all endpoints.

Usage:
    pip install pytest requests
    pytest test_api.py -v

Make sure the backend server is running before executing tests:
    cd backend && npm start
"""

import pytest
import requests
import random
import string

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

BASE_URL = "http://localhost:9000"
API_V1   = f"{BASE_URL}/api/v1"

# Shared state populated during the test session
_state = {
    "user_token":        None,
    "mechanic_token":    None,
    "user_id":           None,
    "mechanic_id":       None,
    "user_username":     None,
    "mechanic_username": None,
    "garage_id":         None,
    "chat_id":           None,
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def rand_str(n=8):
    return "".join(random.choices(string.ascii_lowercase + string.digits, k=n))

def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}

# ---------------------------------------------------------------------------
# 1. Health & Root
# ---------------------------------------------------------------------------

class TestHealthAndRoot:
    def test_health_endpoint(self):
        r = requests.get(f"{BASE_URL}/health", timeout=10)
        assert r.status_code == 200
        assert r.json().get("status") == "OK"

    def test_api_root_endpoint(self):
        r = requests.get(f"{API_V1}", timeout=10)
        assert r.status_code == 200
        assert "endpoints" in r.json()

    def test_unknown_route_returns_404(self):
        r = requests.get(f"{API_V1}/does-not-exist", timeout=10)
        assert r.status_code == 404

# ---------------------------------------------------------------------------
# 2. User Registration
# ---------------------------------------------------------------------------

class TestUserRegistration:
    def test_register_regular_user_success(self):
        uname = f"user_{rand_str()}"
        payload = {
            "username": uname,
            "email":    f"{uname}@example.com",
            "fullName": "Test User",
            "password": "TestPass@123",
            "userType": "user",
        }
        r = requests.post(f"{API_V1}/users/register", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        _state["user_username"] = uname
        _state["user_password"] = payload["password"]
        _state["user_email"]    = payload["email"]

    def test_register_mechanic_success(self):
        mname = f"mech_{rand_str()}"
        payload = {
            "username": mname,
            "email":    f"{mname}@example.com",
            "fullName": "Test Mechanic",
            "password": "MechPass@123",
            "userType": "mechanic",
            "phone":    f"+91{random.randint(7000000000, 9999999999)}",
        }
        r = requests.post(f"{API_V1}/users/register", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        _state["mechanic_username"] = mname
        _state["mechanic_password"] = payload["password"]
        _state["mechanic_email"]    = payload["email"]

    def test_register_duplicate_user_fails(self):
        uname = _state.get("user_username")
        if not uname:
            pytest.skip("Depends on test_register_regular_user_success")
        payload = {
            "username": uname,
            "email":    _state["user_email"],
            "fullName": "Duplicate User",
            "password": "AnotherPass@1",
        }
        r = requests.post(f"{API_V1}/users/register", json=payload, timeout=15)
        assert r.status_code == 409, r.text

    def test_register_missing_required_fields(self):
        r = requests.post(f"{API_V1}/users/register", json={"username": "onlythis"}, timeout=10)
        assert r.status_code == 400

    def test_register_mechanic_without_phone_fails(self):
        uname = f"m_{rand_str()}"
        payload = {
            "username": uname,
            "email":    f"{uname}@example.com",
            "fullName": "Bad Mechanic",
            "password": "Pass@1234",
            "userType": "mechanic",
        }
        r = requests.post(f"{API_V1}/users/register", json=payload, timeout=10)
        assert r.status_code == 400

    def test_register_invalid_user_type(self):
        uname = f"inv_{rand_str()}"
        payload = {
            "username": uname,
            "email":    f"{uname}@example.com",
            "fullName": "Invalid Type",
            "password": "Pass@1234",
            "userType": "admin",
        }
        r = requests.post(f"{API_V1}/users/register", json=payload, timeout=10)
        assert r.status_code == 400

# ---------------------------------------------------------------------------
# 3. Login / Logout
# ---------------------------------------------------------------------------

class TestUserLogin:
    def test_login_regular_user(self):
        uname = _state.get("user_username")
        if not uname:
            pytest.skip("Depends on registration")
        r = requests.post(f"{API_V1}/users/login",
                          json={"username": uname, "password": _state["user_password"]},
                          timeout=10)
        assert r.status_code == 200, r.text
        data = r.json().get("data", {})
        assert "accessToken" in data
        _state["user_token"] = data["accessToken"]
        _state["user_id"]    = data.get("user", {}).get("_id")

    def test_login_mechanic(self):
        mname = _state.get("mechanic_username")
        if not mname:
            pytest.skip("Depends on mechanic registration")
        r = requests.post(f"{API_V1}/users/login",
                          json={"username": mname, "password": _state["mechanic_password"]},
                          timeout=10)
        assert r.status_code == 200, r.text
        data = r.json().get("data", {})
        _state["mechanic_token"] = data.get("accessToken")
        _state["mechanic_id"]   = data.get("user", {}).get("_id")

    def test_login_wrong_password(self):
        uname = _state.get("user_username")
        if not uname:
            pytest.skip("Depends on registration")
        r = requests.post(f"{API_V1}/users/login",
                          json={"username": uname, "password": "WrongPassword!"},
                          timeout=10)
        assert r.status_code == 400

    def test_login_nonexistent_user(self):
        r = requests.post(f"{API_V1}/users/login",
                          json={"username": "ghost_user_xyz", "password": "NoPass@1"},
                          timeout=10)
        assert r.status_code == 404

    def test_login_missing_credentials(self):
        r = requests.post(f"{API_V1}/users/login", json={"password": "SomePass@1"}, timeout=10)
        assert r.status_code == 400

    def test_logout_requires_auth(self):
        r = requests.post(f"{API_V1}/users/logout", timeout=10)
        assert r.status_code == 401

# ---------------------------------------------------------------------------
# 4. Authenticated User Endpoints
# ---------------------------------------------------------------------------

class TestAuthenticatedUserEndpoints:
    def test_get_current_user(self):
        token = _state.get("user_token")
        if not token:
            pytest.skip("Login first")
        r = requests.get(f"{API_V1}/users/get-current-user",
                         headers=auth_headers(token), timeout=10)
        assert r.status_code == 200
        assert r.json().get("data", {}).get("username") == _state["user_username"]

    def test_get_current_user_unauthenticated(self):
        r = requests.get(f"{API_V1}/users/get-current-user", timeout=10)
        assert r.status_code == 401

    def test_update_account_details(self):
        token = _state.get("user_token")
        if not token:
            pytest.skip("Login first")
        r = requests.patch(f"{API_V1}/users/update-account-details",
                           json={"fullName": "Updated Full Name"},
                           headers=auth_headers(token), timeout=10)
        assert r.status_code == 200

    def test_update_location(self):
        token = _state.get("user_token")
        if not token:
            pytest.skip("Login first")
        r = requests.put(f"{API_V1}/users/update-location",
                         json={"location": [77.5946, 12.9716]},
                         headers=auth_headers(token), timeout=10)
        assert r.status_code == 200

    def test_update_location_missing_body(self):
        token = _state.get("user_token")
        if not token:
            pytest.skip("Login first")
        r = requests.put(f"{API_V1}/users/update-location",
                         json={}, headers=auth_headers(token), timeout=10)
        assert r.status_code == 400

    def test_get_user_profile(self):
        token = _state.get("user_token")
        uname = _state.get("user_username")
        if not token or not uname:
            pytest.skip("Login first")
        r = requests.get(f"{API_V1}/users/get-user-profile/{uname}",
                         headers=auth_headers(token), timeout=10)
        assert r.status_code == 200

    def test_get_user_profile_nonexistent(self):
        token = _state.get("user_token")
        if not token:
            pytest.skip("Login first")
        r = requests.get(f"{API_V1}/users/get-user-profile/ghost_xyz_999",
                         headers=auth_headers(token), timeout=10)
        assert r.status_code == 404

    def test_change_password_wrong_old_password(self):
        token = _state.get("user_token")
        if not token:
            pytest.skip("Login first")
        r = requests.post(f"{API_V1}/users/change-password",
                          json={"oldPassword": "WrongOldPass@1", "newPassword": "NewPass@123"},
                          headers=auth_headers(token), timeout=10)
        assert r.status_code == 400

# ---------------------------------------------------------------------------
# 5. Password Reset Flow
# ---------------------------------------------------------------------------

class TestPasswordReset:
    def test_forgot_password_nonexistent_email(self):
        r = requests.post(f"{API_V1}/users/forgot-password",
                          json={"email": "nobody@nowhere.invalid"}, timeout=10)
        assert r.status_code == 404

    def test_forgot_password_missing_email(self):
        r = requests.post(f"{API_V1}/users/forgot-password", json={}, timeout=10)
        assert r.status_code in (400, 404)

    def test_reset_password_missing_token(self):
        r = requests.post(f"{API_V1}/users/reset-password",
                          json={"password": "NewPass@123"}, timeout=10)
        assert r.status_code == 400

    def test_reset_password_invalid_token(self):
        r = requests.post(f"{API_V1}/users/reset-password",
                          json={"token": "invalid.token.here", "password": "NewPass@123"},
                          timeout=10)
        assert r.status_code == 401

    def test_reset_password_short_password(self):
        r = requests.post(f"{API_V1}/users/reset-password",
                          json={"token": "sometoken", "password": "abc"}, timeout=10)
        assert r.status_code == 400

# ---------------------------------------------------------------------------
# 6. Email Verification
# ---------------------------------------------------------------------------

class TestEmailVerification:
    def test_verify_email_missing_token(self):
        r = requests.post(f"{API_V1}/users/verify-email", json={}, timeout=10)
        assert r.status_code == 400

    def test_verify_email_invalid_token(self):
        r = requests.post(f"{API_V1}/users/verify-email",
                          json={"token": "completely_invalid_token_abc123"}, timeout=10)
        assert r.status_code == 400

# ---------------------------------------------------------------------------
# 7. Garage Endpoints
# ---------------------------------------------------------------------------

class TestGarageEndpoints:
    def test_add_garage_as_mechanic(self):
        token = _state.get("mechanic_token")
        if not token:
            pytest.skip("Mechanic login required")
        payload = {"name": f"TestGarage_{rand_str(4)}", "location": [77.5946, 12.9716]}
        r = requests.post(f"{API_V1}/users/add-or-update-garage",
                          json=payload, headers=auth_headers(token), timeout=10)
        assert r.status_code == 200, r.text
        data = r.json().get("data", [])
        assert isinstance(data, list) and len(data) > 0
        _state["garage_id"] = str(data[0].get("_id", ""))

    def test_add_garage_as_regular_user_forbidden(self):
        token = _state.get("user_token")
        if not token:
            pytest.skip("User login required")
        r = requests.post(f"{API_V1}/users/add-or-update-garage",
                          json={"name": "FakeGarage", "location": [77.5946, 12.9716]},
                          headers=auth_headers(token), timeout=10)
        assert r.status_code == 403

    def test_add_garage_missing_fields(self):
        token = _state.get("mechanic_token")
        if not token:
            pytest.skip("Mechanic login required")
        r = requests.post(f"{API_V1}/users/add-or-update-garage",
                          json={"name": "NoLocation"},
                          headers=auth_headers(token), timeout=10)
        assert r.status_code == 400

    def test_get_user_garages(self):
        mechanic_id = _state.get("mechanic_id")
        if not mechanic_id:
            pytest.skip("Mechanic login required")
        r = requests.get(f"{API_V1}/users/garages/{mechanic_id}", timeout=10)
        assert r.status_code == 200, r.text
        assert isinstance(r.json().get("data"), list)

    def test_get_garages_invalid_id(self):
        r = requests.get(f"{API_V1}/users/garages/not_an_object_id", timeout=10)
        assert r.status_code in (400, 404, 500)

    def test_delete_garage_invalid_index(self):
        token = _state.get("mechanic_token")
        if not token:
            pytest.skip("Mechanic login required")
        r = requests.post(f"{API_V1}/users/delete-garage",
                          json={"index": 9999},
                          headers=auth_headers(token), timeout=10)
        assert r.status_code == 400

# ---------------------------------------------------------------------------
# 8. Mechanic Endpoints
# ---------------------------------------------------------------------------

class TestMechanicEndpoints:
    def test_get_nearby_mechanics_public(self):
        r = requests.get(f"{API_V1}/mechanics/nearby",
                         params={"lat": 12.9716, "lon": 77.5946, "radius": 5},
                         timeout=10)
        assert r.status_code == 200

    def test_get_nearby_mechanics_no_params(self):
        r = requests.get(f"{API_V1}/mechanics/nearby", timeout=10)
        assert r.status_code in (200, 400)

    def test_mechanic_add_garage(self):
        token = _state.get("mechanic_token")
        if not token:
            pytest.skip("Mechanic login required")
        payload = {"name": f"MechGarage_{rand_str(4)}", "location": [77.6011, 12.9768]}
        r = requests.post(f"{API_V1}/mechanics/garage",
                          json=payload, headers=auth_headers(token), timeout=10)
        assert r.status_code == 200, r.text

    def test_mechanic_garage_as_regular_user_forbidden(self):
        token = _state.get("user_token")
        if not token:
            pytest.skip("User login required")
        r = requests.post(f"{API_V1}/mechanics/garage",
                          json={"name": "SomeGarage", "location": [77.6011, 12.9768]},
                          headers=auth_headers(token), timeout=10)
        assert r.status_code == 403

    def test_mechanic_update_availability_true(self):
        token = _state.get("mechanic_token")
        if not token:
            pytest.skip("Mechanic login required")
        r = requests.patch(f"{API_V1}/mechanics/update-availability",
                           json={"isAvailable": True},
                           headers=auth_headers(token), timeout=10)
        assert r.status_code == 200
        assert r.json().get("data", {}).get("isAvailable") is True

    def test_update_availability_as_user_forbidden(self):
        token = _state.get("user_token")
        if not token:
            pytest.skip("User login required")
        r = requests.patch(f"{API_V1}/mechanics/update-availability",
                           json={"isAvailable": True},
                           headers=auth_headers(token), timeout=10)
        assert r.status_code == 403

    def test_update_availability_unauthenticated(self):
        r = requests.patch(f"{API_V1}/mechanics/update-availability",
                           json={"isAvailable": True}, timeout=10)
        assert r.status_code == 401

    def test_rate_mechanic_invalid_value(self):
        token = _state.get("user_token")
        mechanic_id = _state.get("mechanic_id")
        if not token or not mechanic_id:
            pytest.skip("Both logins required")
        r = requests.post(f"{API_V1}/mechanics/rate/{mechanic_id}",
                          json={"value": 10},
                          headers=auth_headers(token), timeout=10)
        assert r.status_code == 400

    def test_rate_mechanic_nonexistent(self):
        token = _state.get("user_token")
        if not token:
            pytest.skip("User login required")
        r = requests.post(f"{API_V1}/mechanics/rate/000000000000000000000000",
                          json={"value": 5},
                          headers=auth_headers(token), timeout=10)
        assert r.status_code == 404

# ---------------------------------------------------------------------------
# 9. Garage Requests
# ---------------------------------------------------------------------------

class TestGarageRequests:
    def test_get_my_garage_requests(self):
        token = _state.get("user_token")
        if not token:
            pytest.skip("User login required")
        r = requests.get(f"{API_V1}/mechanics/garage-requests/mine",
                         headers=auth_headers(token), timeout=10)
        assert r.status_code == 200
        assert isinstance(r.json().get("data"), list)

    def test_get_incoming_requests_as_user_forbidden(self):
        token = _state.get("user_token")
        if not token:
            pytest.skip("User login required")
        r = requests.get(f"{API_V1}/mechanics/garage-requests/incoming",
                         headers=auth_headers(token), timeout=10)
        assert r.status_code == 403

    def test_get_incoming_requests_as_mechanic(self):
        token = _state.get("mechanic_token")
        if not token:
            pytest.skip("Mechanic login required")
        r = requests.get(f"{API_V1}/mechanics/garage-requests/incoming",
                         headers=auth_headers(token), timeout=10)
        assert r.status_code == 200

    def test_create_garage_request_invalid_ids(self):
        token = _state.get("user_token")
        if not token:
            pytest.skip("User login required")
        r = requests.post(f"{API_V1}/mechanics/badid/garages/badgarageid/requests",
                          json={"description": "My car broke down"},
                          headers=auth_headers(token), timeout=10)
        assert r.status_code == 400

    def test_create_garage_request_missing_description(self):
        token  = _state.get("user_token")
        mech   = _state.get("mechanic_id") or "000000000000000000000001"
        garage = _state.get("garage_id")  or "000000000000000000000002"
        if not token:
            pytest.skip("User login required")
        r = requests.post(f"{API_V1}/mechanics/{mech}/garages/{garage}/requests",
                          json={}, headers=auth_headers(token), timeout=10)
        assert r.status_code in (400, 404)

    def test_mechanic_cannot_create_garage_request(self):
        token  = _state.get("mechanic_token")
        mech   = _state.get("mechanic_id") or "000000000000000000000001"
        garage = _state.get("garage_id")  or "000000000000000000000002"
        if not token:
            pytest.skip("Mechanic login required")
        r = requests.post(f"{API_V1}/mechanics/{mech}/garages/{garage}/requests",
                          json={"description": "Mechanic trying to request"},
                          headers=auth_headers(token), timeout=10)
        assert r.status_code == 403

    def test_update_request_status_invalid_id(self):
        token = _state.get("mechanic_token")
        if not token:
            pytest.skip("Mechanic login required")
        r = requests.patch(f"{API_V1}/mechanics/garage-requests/not_valid_id/status",
                           json={"status": "accepted", "estimatedArrivalMinutes": 30},
                           headers=auth_headers(token), timeout=10)
        assert r.status_code == 400

    def test_update_request_status_invalid_status(self):
        token = _state.get("mechanic_token")
        if not token:
            pytest.skip("Mechanic login required")
        r = requests.patch(f"{API_V1}/mechanics/garage-requests/000000000000000000000001/status",
                           json={"status": "flying"},
                           headers=auth_headers(token), timeout=10)
        assert r.status_code == 400

# ---------------------------------------------------------------------------
# 10. Chat Endpoints
# ---------------------------------------------------------------------------

class TestChatEndpoints:
    def test_get_all_chats_unauthenticated(self):
        r = requests.get(f"{API_V1}/chats/", timeout=10)
        assert r.status_code == 401

    def test_get_all_chats_authenticated(self):
        token = _state.get("user_token")
        if not token:
            pytest.skip("User login required")
        r = requests.get(f"{API_V1}/chats/", headers=auth_headers(token), timeout=10)
        assert r.status_code == 200

    def test_get_or_create_chat_with_mechanic(self):
        token       = _state.get("user_token")
        mechanic_id = _state.get("mechanic_id")
        if not token or not mechanic_id:
            pytest.skip("Both logins required")
        r = requests.get(f"{API_V1}/chats/user/{mechanic_id}",
                         headers=auth_headers(token), timeout=10)
        assert r.status_code in (200, 201), r.text
        _state["chat_id"] = r.json().get("data", {}).get("_id")

    def test_get_chat_messages(self):
        token   = _state.get("user_token")
        chat_id = _state.get("chat_id")
        if not token or not chat_id:
            pytest.skip("Chat creation required")
        r = requests.get(f"{API_V1}/chats/{chat_id}/messages",
                         headers=auth_headers(token), timeout=10)
        assert r.status_code == 200

    def test_send_message_missing_fields(self):
        token = _state.get("user_token")
        if not token:
            pytest.skip("User login required")
        r = requests.post(f"{API_V1}/chats/message",
                          json={}, headers=auth_headers(token), timeout=10)
        assert r.status_code in (400, 404)

    def test_mark_messages_read_unauthenticated(self):
        r = requests.post(f"{API_V1}/chats/000000000000000000000001/mark-read", timeout=10)
        assert r.status_code == 401

    def test_mark_messages_read_authenticated(self):
        token   = _state.get("user_token")
        chat_id = _state.get("chat_id")
        if not token or not chat_id:
            pytest.skip("Chat creation required")
        r = requests.post(f"{API_V1}/chats/{chat_id}/mark-read",
                          headers=auth_headers(token), timeout=10)
        assert r.status_code == 200

# ---------------------------------------------------------------------------
# 11. AI Endpoint
# ---------------------------------------------------------------------------

class TestAIEndpoint:
    def test_ai_ask_unauthenticated(self):
        r = requests.post(f"{API_V1}/ai/ask",
                          json={"query": "What is RoadResQ?"}, timeout=10)
        assert r.status_code == 401

    def test_ai_ask_authenticated(self):
        token = _state.get("user_token")
        if not token:
            pytest.skip("User login required")
        r = requests.post(f"{API_V1}/ai/ask",
                          json={"query": "My car won't start. What should I do?"},
                          headers=auth_headers(token), timeout=30)
        assert r.status_code in (200, 500, 503), f"{r.status_code}: {r.text}"

    def test_ai_ask_empty_message(self):
        token = _state.get("user_token")
        if not token:
            pytest.skip("User login required")
        r = requests.post(f"{API_V1}/ai/ask",
                          json={"query": ""},
                          headers=auth_headers(token), timeout=15)
        assert r.status_code in (200, 400, 500)

# ---------------------------------------------------------------------------
# 12. Token Refresh
# ---------------------------------------------------------------------------

class TestTokenRefresh:
    def test_refresh_token_missing(self):
        r = requests.post(f"{API_V1}/users/auth/refresh-token", json={}, timeout=10)
        assert r.status_code == 400

    def test_refresh_token_invalid(self):
        r = requests.post(f"{API_V1}/users/auth/refresh-token",
                          headers={"x-refresh-token": "completely.invalid.token"},
                          timeout=10)
        assert r.status_code == 400

# ---------------------------------------------------------------------------
# 13. Logout (Cleanup)
# ---------------------------------------------------------------------------

class TestLogout:
    def test_logout_user(self):
        token = _state.get("user_token")
        if not token:
            pytest.skip("User was not logged in")
        r = requests.post(f"{API_V1}/users/logout",
                          headers=auth_headers(token), timeout=10)
        assert r.status_code == 200

    def test_logout_mechanic(self):
        token = _state.get("mechanic_token")
        if not token:
            pytest.skip("Mechanic was not logged in")
        r = requests.post(f"{API_V1}/users/logout",
                          headers=auth_headers(token), timeout=10)
        assert r.status_code == 200

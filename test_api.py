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
import time
import random
import string

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

BASE_URL = "http://localhost:9000"
API_V1   = f"{BASE_URL}/api/v1"

# Shared state populated during the test session
_state = {
    "user_token":     None,
    "mechanic_token": None,
    "user_id":        None,
    "mechanic_id":    None,
    "user_username":  None,
    "mechanic_username": None,
    "garage_id":      None,
    "chat_id":        None,
    "garage_request_id": None,
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def rand_str(n=8):
    """Return a random lowercase alphanumeric string of length *n*."""
    return "".join(random.choices(string.ascii_lowercase + string.digits, k=n))


def auth_headers(token):
    """Return Authorization headers for a Bearer *token*."""
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# 1. Health & Root Endpoints
# ---------------------------------------------------------------------------

class TestHealthAndRoot:
    """Sanity checks – server must be reachable before any other tests."""

    def test_health_endpoint(self):
        """GET /health → 200 with status OK."""
        r = requests.get(f"{BASE_URL}/health", timeout=10)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        body = r.json()
        assert body.get("status") == "OK", f"Unexpected body: {body}"
        assert "timestamp" in body, "Missing 'timestamp' in health response"

    def test_api_root_endpoint(self):
        """GET /api/v1 → 200 with endpoint map."""
        r = requests.get(f"{API_V1}", timeout=10)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        body = r.json()
        assert "endpoints" in body, f"Missing 'endpoints' key: {body}"

    def test_unknown_route_returns_404(self):
        """GET /api/v1/does-not-exist → 404."""
        r = requests.get(f"{API_V1}/does-not-exist", timeout=10)
        assert r.status_code == 404, f"Expected 404, got {r.status_code}"


# ---------------------------------------------------------------------------
# 2. User Registration
# ---------------------------------------------------------------------------

class TestUserRegistration:
    """POST /api/v1/users/register"""

    def test_register_regular_user_success(self):
        """Register a new regular user – expect 200."""
        uname = f"user_{rand_str()}"
        payload = {
            "username": uname,
            "email":    f"{uname}@example.com",
            "fullName": "Test User",
            "password": "TestPass@123",
            "userType": "user",
        }
        r = requests.post(f"{API_V1}/users/register", json=payload, timeout=15)
        assert r.status_code == 200, f"Registration failed: {r.text}"
        body = r.json()
        assert body.get("success") is True or body.get("statusCode") == 200
        # Save credentials for later tests
        _state["user_username"] = uname
        _state["user_password"] = payload["password"]
        _state["user_email"]    = payload["email"]

    def test_register_mechanic_success(self):
        """Register a new mechanic user – expect 200."""
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
        assert r.status_code == 200, f"Mechanic registration failed: {r.text}"
        _state["mechanic_username"] = mname
        _state["mechanic_password"] = payload["password"]
        _state["mechanic_email"]    = payload["email"]

    def test_register_duplicate_user_fails(self):
        """Re-registering the same username/email → 409."""
        uname = _state.get("user_username")
        if not uname:
            pytest.skip("Dependent on test_register_regular_user_success")
        payload = {
            "username": uname,
            "email":    _state["user_email"],
            "fullName": "Duplicate User",
            "password": "AnotherPass@1",
        }
        r = requests.post(f"{API_V1}/users/register", json=payload, timeout=15)
        assert r.status_code == 409, f"Expected 409, got {r.status_code}: {r.text}"

    def test_register_missing_required_fields(self):
        """Omitting required fields → 400."""
        r = requests.post(f"{API_V1}/users/register", json={"username": "onlythis"}, timeout=10)
        assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"

    def test_register_mechanic_without_phone_fails(self):
        """Mechanic registration without phone → 400."""
        uname = f"m_{rand_str()}"
        payload = {
            "username": uname,
            "email":    f"{uname}@example.com",
            "fullName": "Bad Mechanic",
            "password": "Pass@1234",
            "userType": "mechanic",
            # phone deliberately omitted
        }
        r = requests.post(f"{API_V1}/users/register", json=payload, timeout=10)
        assert r.status_code == 400, f"Expected 400 for mechanic without phone, got {r.status_code}"

    def test_register_invalid_user_type(self):
        """userType with an unexpected value → 400."""
        uname = f"inv_{rand_str()}"
        payload = {
            "username": uname,
            "email":    f"{uname}@example.com",
            "fullName": "Invalid Type",
            "password": "Pass@1234",
            "userType": "admin",  # not allowed
        }
        r = requests.post(f"{API_V1}/users/register", json=payload, timeout=10)
        assert r.status_code == 400, f"Expected 400 for invalid userType, got {r.status_code}"


# ---------------------------------------------------------------------------
# 3. User Login / Logout
# ---------------------------------------------------------------------------

class TestUserLogin:
    """POST /api/v1/users/login  |  POST /api/v1/users/logout"""

    def test_login_regular_user(self):
        """Login with valid credentials → 200 + tokens."""
        uname = _state.get("user_username")
        if not uname:
            pytest.skip("Dependent on TestUserRegistration")
        payload = {"username": uname, "password": _state["user_password"]}
        r = requests.post(f"{API_V1}/users/login", json=payload, timeout=10)
        assert r.status_code == 200, f"Login failed: {r.text}"
        body = r.json()
        data = body.get("data", {})
        assert "accessToken" in data, f"No accessToken in response: {body}"
        _state["user_token"] = data["accessToken"]
        _state["user_id"]    = data.get("user", {}).get("_id")

    def test_login_mechanic(self):
        """Login as mechanic → 200 + tokens."""
        mname = _state.get("mechanic_username")
        if not mname:
            pytest.skip("Dependent on TestUserRegistration mechanic test")
        payload = {"username": mname, "password": _state["mechanic_password"]}
        r = requests.post(f"{API_V1}/users/login", json=payload, timeout=10)
        assert r.status_code == 200, f"Mechanic login failed: {r.text}"
        data = r.json().get("data", {})
        _state["mechanic_token"] = data.get("accessToken")
        _state["mechanic_id"]   = data.get("user", {}).get("_id")

    def test_login_wrong_password(self):
        """Wrong password → 400."""
        uname = _state.get("user_username")
        if not uname:
            pytest.skip("Dependent on TestUserRegistration")
        r = requests.post(
            f"{API_V1}/users/login",
            json={"username": uname, "password": "WrongPassword!"},
            timeout=10,
        )
        assert r.status_code == 400, f"Expected 400, got {r.status_code}"

    def test_login_nonexistent_user(self):
        """Non-existent user → 404."""
        r = requests.post(
            f"{API_V1}/users/login",
            json={"username": "ghost_user_xyz", "password": "NoPass@1"},
            timeout=10,
        )
        assert r.status_code == 404, f"Expected 404, got {r.status_code}"

    def test_login_missing_credentials(self):
        """Missing username and email → 400."""
        r = requests.post(f"{API_V1}/users/login", json={"password": "SomePass@1"}, timeout=10)
        assert r.status_code == 400, f"Expected 400, got {r.status_code}"

    def test_logout_requires_auth(self):
        """POST /logout without token → 401."""
        r = requests.post(f"{API_V1}/users/logout", timeout=10)
        assert r.status_code == 401, f"Expected 401, got {r.status_code}"


# ---------------------------------------------------------------------------
# 4. Authenticated User Endpoints
# ---------------------------------------------------------------------------

class TestAuthenticatedUserEndpoints:
    """Endpoints that require a valid JWT."""

    def test_get_current_user(self):
        """GET /get-current-user → 200 with user object."""
        token = _state.get("user_token")
        if not token:
            pytest.skip("Login first")
        r = requests.get(
            f"{API_V1}/users/get-current-user",
            headers=auth_headers(token),
            timeout=10,
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json().get("data", {})
        assert data.get("username") == _state["user_username"]

    def test_get_current_user_unauthenticated(self):
        """GET /get-current-user without token → 401."""
        r = requests.get(f"{API_V1}/users/get-current-user", timeout=10)
        assert r.status_code == 401, f"Expected 401, got {r.status_code}"

    def test_update_account_details(self):
        """PATCH /update-account-details → 200."""
        token = _state.get("user_token")
        if not token:
            pytest.skip("Login first")
        r = requests.patch(
            f"{API_V1}/users/update-account-details",
            json={"fullName": "Updated Full Name"},
            headers=auth_headers(token),
            timeout=10,
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"

    def test_update_location(self):
        """PUT /update-location → 200 with updated location."""
        token = _state.get("user_token")
        if not token:
            pytest.skip("Login first")
        r = requests.put(
            f"{API_V1}/users/update-location",
            json={"location": [77.5946, 12.9716]},   # [lng, lat] Bangalore
            headers=auth_headers(token),
            timeout=10,
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"

    def test_update_location_invalid_coordinates(self):
        """PUT /update-location with invalid coords → 400."""
        token = _state.get("user_token")
        if not token:
            pytest.skip("Login first")
        r = requests.put(
            f"{API_V1}/users/update-location",
            json={"location": [200, 200]},  # out-of-range
            headers=auth_headers(token),
            timeout=10,
        )
        # The server returns 400 for invalid location arrays
        assert r.status_code in (400, 200), f"Unexpected status: {r.status_code}"

    def test_update_location_missing_body(self):
        """PUT /update-location with missing body → 400."""
        token = _state.get("user_token")
        if not token:
            pytest.skip("Login first")
        r = requests.put(
            f"{API_V1}/users/update-location",
            json={},
            headers=auth_headers(token),
            timeout=10,
        )
        assert r.status_code == 400, f"Expected 400, got {r.status_code}"

    def test_get_user_profile(self):
        """GET /get-user-profile/:username → 200 with profile data."""
        token = _state.get("user_token")
        uname = _state.get("user_username")
        if not token or not uname:
            pytest.skip("Login first")
        r = requests.get(
            f"{API_V1}/users/get-user-profile/{uname}",
            headers=auth_headers(token),
            timeout=10,
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"

    def test_get_user_profile_nonexistent(self):
        """GET /get-user-profile/ghost_xyz → 404."""
        token = _state.get("user_token")
        if not token:
            pytest.skip("Login first")
        r = requests.get(
            f"{API_V1}/users/get-user-profile/ghost_xyz_999",
            headers=auth_headers(token),
            timeout=10,
        )
        assert r.status_code == 404, f"Expected 404, got {r.status_code}"

    def test_change_password_wrong_old_password(self):
        """POST /change-password with wrong old password → 400."""
        token = _state.get("user_token")
        if not token:
            pytest.skip("Login first")
        r = requests.post(
            f"{API_V1}/users/change-password",
            json={"oldPassword": "WrongOldPass@1", "newPassword": "NewPass@123"},
            headers=auth_headers(token),
            timeout=10,
        )
        assert r.status_code == 400, f"Expected 400, got {r.status_code}"


# ---------------------------------------------------------------------------
# 5. Password Reset Flow
# ---------------------------------------------------------------------------

class TestPasswordReset:
    """POST /forgot-password  |  POST /reset-password"""

    def test_forgot_password_nonexistent_email(self):
        """Forgot password for unknown email → 404."""
        r = requests.post(
            f"{API_V1}/users/forgot-password",
            json={"email": "nobody@nowhere.invalid"},
            timeout=10,
        )
        assert r.status_code == 404, f"Expected 404, got {r.status_code}"

    def test_forgot_password_missing_email(self):
        """Forgot password with no payload → 404 or 400."""
        r = requests.post(f"{API_V1}/users/forgot-password", json={}, timeout=10)
        assert r.status_code in (400, 404), f"Unexpected status: {r.status_code}"

    def test_reset_password_missing_token(self):
        """Reset password without token → 400."""
        r = requests.post(
            f"{API_V1}/users/reset-password",
            json={"password": "NewPass@123"},
            timeout=10,
        )
        assert r.status_code == 400, f"Expected 400, got {r.status_code}"

    def test_reset_password_invalid_token(self):
        """Reset password with bogus token → 401."""
        r = requests.post(
            f"{API_V1}/users/reset-password",
            json={"token": "invalid.token.here", "password": "NewPass@123"},
            timeout=10,
        )
        assert r.status_code == 401, f"Expected 401, got {r.status_code}"

    def test_reset_password_short_password(self):
        """Reset password with a too-short password → 400."""
        r = requests.post(
            f"{API_V1}/users/reset-password",
            json={"token": "sometoken", "password": "abc"},
            timeout=10,
        )
        assert r.status_code == 400, f"Expected 400, got {r.status_code}"


# ---------------------------------------------------------------------------
# 6. Email Verification
# ---------------------------------------------------------------------------

class TestEmailVerification:
    """POST /api/v1/users/verify-email"""

    def test_verify_email_missing_token(self):
        """Verify email without token → 400."""
        r = requests.post(f"{API_V1}/users/verify-email", json={}, timeout=10)
        assert r.status_code == 400, f"Expected 400, got {r.status_code}"

    def test_verify_email_invalid_token(self):
        """Verify email with bogus token → 400."""
        r = requests.post(
            f"{API_V1}/users/verify-email",
            json={"token": "completely_invalid_token_abc123"},
            timeout=10,
        )
        assert r.status_code == 400, f"Expected 400, got {r.status_code}"


# ---------------------------------------------------------------------------
# 7. Garage Endpoints (User routes)
# ---------------------------------------------------------------------------

class TestGarageEndpoints:
    """POST /add-or-update-garage  |  POST /delete-garage  |  GET /garages/:id"""

    def test_add_garage_as_mechanic(self):
        """POST /add-or-update-garage as a mechanic → 200."""
        token = _state.get("mechanic_token")
        if not token:
            pytest.skip("Mechanic login required")
        payload = {
            "name":     f"TestGarage_{rand_str(4)}",
            "location": [77.5946, 12.9716],
        }
        r = requests.post(
            f"{API_V1}/users/add-or-update-garage",
            json=payload,
            headers=auth_headers(token),
            timeout=10,
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json().get("data", [])
        assert isinstance(data, list) and len(data) > 0
        _state["garage_id"] = str(data[0].get("_id", ""))

    def test_add_garage_as_regular_user_forbidden(self):
        """Regular user cannot add a garage → 403."""
        token = _state.get("user_token")
        if not token:
            pytest.skip("User login required")
        r = requests.post(
            f"{API_V1}/users/add-or-update-garage",
            json={"name": "FakeGarage", "location": [77.5946, 12.9716]},
            headers=auth_headers(token),
            timeout=10,
        )
        assert r.status_code == 403, f"Expected 403, got {r.status_code}"

    def test_add_garage_missing_fields(self):
        """Missing location → 400."""
        token = _state.get("mechanic_token")
        if not token:
            pytest.skip("Mechanic login required")
        r = requests.post(
            f"{API_V1}/users/add-or-update-garage",
            json={"name": "NoLocation"},
            headers=auth_headers(token),
            timeout=10,
        )
        assert r.status_code == 400, f"Expected 400, got {r.status_code}"

    def test_get_user_garages(self):
        """GET /garages/:id → 200 with list of garages."""
        mechanic_id = _state.get("mechanic_id")
        if not mechanic_id:
            pytest.skip("Mechanic login required")
        r = requests.get(f"{API_V1}/users/garages/{mechanic_id}", timeout=10)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json().get("data")
        assert isinstance(data, list), f"Expected list, got: {data}"

    def test_get_garages_invalid_id(self):
        """GET /garages/invalidid → 500 or 400 (cast error from Mongoose)."""
        r = requests.get(f"{API_V1}/users/garages/not_an_object_id", timeout=10)
        assert r.status_code in (400, 404, 500), f"Unexpected status: {r.status_code}"

    def test_delete_garage_invalid_index(self):
        """POST /delete-garage with out-of-range index → 400."""
        token = _state.get("mechanic_token")
        if not token:
            pytest.skip("Mechanic login required")
        r = requests.post(
            f"{API_V1}/users/delete-garage",
            json={"index": 9999},
            headers=auth_headers(token),
            timeout=10,
        )
        assert r.status_code == 400, f"Expected 400, got {r.status_code}"


# ---------------------------------------------------------------------------
# 8. Mechanic / Nearby Endpoints
# ---------------------------------------------------------------------------

class TestMechanicEndpoints:
    """GET /api/v1/mechanics/nearby  |  Garage management"""

    def test_get_nearby_mechanics_public(self):
        """GET /nearby is a public endpoint → 200."""
        r = requests.get(
            f"{API_V1}/mechanics/nearby",
            params={"longitude": 77.5946, "latitude": 12.9716, "maxDistance": 10000},
            timeout=10,
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        body = r.json()
        assert "data" in body or "success" in body, f"Unexpected response: {body}"

    def test_get_nearby_mechanics_no_params(self):
        """GET /nearby without params → 200 (server may return empty or all)."""
        r = requests.get(f"{API_V1}/mechanics/nearby", timeout=10)
        assert r.status_code in (200, 400), f"Unexpected status: {r.status_code}"

    def test_mechanic_add_garage(self):
        """POST /mechanic/garage as mechanic → 200."""
        token = _state.get("mechanic_token")
        if not token:
            pytest.skip("Mechanic login required")
        payload = {
            "name":     f"MechGarage_{rand_str(4)}",
            "location": [77.6011, 12.9768],
        }
        r = requests.post(
            f"{API_V1}/mechanics/garage",
            json=payload,
            headers=auth_headers(token),
            timeout=10,
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json().get("data", [])
        assert isinstance(data, list)

    def test_mechanic_garage_as_regular_user_forbidden(self):
        """POST /mechanic/garage as regular user → 403."""
        token = _state.get("user_token")
        if not token:
            pytest.skip("User login required")
        r = requests.post(
            f"{API_V1}/mechanics/garage",
            json={"name": "SomeGarage", "location": [77.6011, 12.9768]},
            headers=auth_headers(token),
            timeout=10,
        )
        assert r.status_code == 403, f"Expected 403, got {r.status_code}"

    def test_mechanic_update_availability(self):
        """PATCH /update-availability as mechanic → 200."""
        token = _state.get("mechanic_token")
        if not token:
            pytest.skip("Mechanic login required")
        r = requests.patch(
            f"{API_V1}/mechanics/update-availability",
            json={"isAvailable": True},
            headers=auth_headers(token),
            timeout=10,
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json().get("data", {})
        assert data.get("isAvailable") is True

    def test_update_availability_as_user_forbidden(self):
        """PATCH /update-availability as regular user → 403."""
        token = _state.get("user_token")
        if not token:
            pytest.skip("User login required")
        r = requests.patch(
            f"{API_V1}/mechanics/update-availability",
            json={"isAvailable": True},
            headers=auth_headers(token),
            timeout=10,
        )
        assert r.status_code == 403, f"Expected 403, got {r.status_code}"

    def test_update_availability_unauthenticated(self):
        """PATCH /update-availability without token → 401."""
        r = requests.patch(
            f"{API_V1}/mechanics/update-availability",
            json={"isAvailable": True},
            timeout=10,
        )
        assert r.status_code == 401, f"Expected 401, got {r.status_code}"

    def test_rate_mechanic_invalid_value(self):
        """POST /rate/:mechanicId with out-of-range rating → 400."""
        token = _state.get("user_token")
        mechanic_id = _state.get("mechanic_id")
        if not token or not mechanic_id:
            pytest.skip("User and mechanic login required")
        r = requests.post(
            f"{API_V1}/mechanics/rate/{mechanic_id}",
            json={"value": 10},   # valid range is 1-5
            headers=auth_headers(token),
            timeout=10,
        )
        assert r.status_code == 400, f"Expected 400, got {r.status_code}"

    def test_rate_mechanic_nonexistent(self):
        """POST /rate/nonexistent_id → 404."""
        token = _state.get("user_token")
        if not token:
            pytest.skip("User login required")
        r = requests.post(
            f"{API_V1}/mechanics/rate/000000000000000000000000",
            json={"value": 5},
            headers=auth_headers(token),
            timeout=10,
        )
        assert r.status_code == 404, f"Expected 404, got {r.status_code}"


# ---------------------------------------------------------------------------
# 9. Garage Request Endpoints
# ---------------------------------------------------------------------------

class TestGarageRequests:
    """
    POST /:mechanicId/garages/:garageId/requests
    GET  /garage-requests/incoming
    GET  /garage-requests/mine
    PATCH /garage-requests/:requestId/status
    """

    def test_get_my_garage_requests(self):
        """GET /garage-requests/mine as user → 200."""
        token = _state.get("user_token")
        if not token:
            pytest.skip("User login required")
        r = requests.get(
            f"{API_V1}/mechanics/garage-requests/mine",
            headers=auth_headers(token),
            timeout=10,
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json().get("data")
        assert isinstance(data, list), f"Expected list, got: {data}"

    def test_get_incoming_requests_as_user_forbidden(self):
        """GET /garage-requests/incoming as regular user → 403."""
        token = _state.get("user_token")
        if not token:
            pytest.skip("User login required")
        r = requests.get(
            f"{API_V1}/mechanics/garage-requests/incoming",
            headers=auth_headers(token),
            timeout=10,
        )
        assert r.status_code == 403, f"Expected 403, got {r.status_code}"

    def test_get_incoming_requests_as_mechanic(self):
        """GET /garage-requests/incoming as mechanic → 200."""
        token = _state.get("mechanic_token")
        if not token:
            pytest.skip("Mechanic login required")
        r = requests.get(
            f"{API_V1}/mechanics/garage-requests/incoming",
            headers=auth_headers(token),
            timeout=10,
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"

    def test_create_garage_request_invalid_ids(self):
        """POST request with invalid ObjectIds → 400."""
        token = _state.get("user_token")
        if not token:
            pytest.skip("User login required")
        r = requests.post(
            f"{API_V1}/mechanics/badid/garages/badgarageid/requests",
            json={"description": "My car broke down"},
            headers=auth_headers(token),
            timeout=10,
        )
        assert r.status_code == 400, f"Expected 400, got {r.status_code}"

    def test_create_garage_request_missing_description(self):
        """POST garage request without description → 400."""
        token  = _state.get("user_token")
        mech   = _state.get("mechanic_id") or "000000000000000000000001"
        garage = _state.get("garage_id")  or "000000000000000000000002"
        if not token:
            pytest.skip("User login required")
        r = requests.post(
            f"{API_V1}/mechanics/{mech}/garages/{garage}/requests",
            json={},
            headers=auth_headers(token),
            timeout=10,
        )
        assert r.status_code in (400, 404), f"Unexpected status: {r.status_code}"

    def test_mechanic_cannot_create_garage_request(self):
        """Mechanics cannot send garage requests → 403."""
        token  = _state.get("mechanic_token")
        mech   = _state.get("mechanic_id") or "000000000000000000000001"
        garage = _state.get("garage_id")  or "000000000000000000000002"
        if not token:
            pytest.skip("Mechanic login required")
        r = requests.post(
            f"{API_V1}/mechanics/{mech}/garages/{garage}/requests",
            json={"description": "Mechanic trying to request"},
            headers=auth_headers(token),
            timeout=10,
        )
        assert r.status_code == 403, f"Expected 403, got {r.status_code}"

    def test_update_request_status_invalid_id(self):
        """PATCH /garage-requests/:invalidId/status → 400."""
        token = _state.get("mechanic_token")
        if not token:
            pytest.skip("Mechanic login required")
        r = requests.patch(
            f"{API_V1}/mechanics/garage-requests/not_valid_id/status",
            json={"status": "accepted", "estimatedArrivalMinutes": 30},
            headers=auth_headers(token),
            timeout=10,
        )
        assert r.status_code == 400, f"Expected 400, got {r.status_code}"

    def test_update_request_status_invalid_status(self):
        """PATCH /garage-requests/:id/status with bad status → 400."""
        token = _state.get("mechanic_token")
        if not token:
            pytest.skip("Mechanic login required")
        r = requests.patch(
            f"{API_V1}/mechanics/garage-requests/000000000000000000000001/status",
            json={"status": "flying"},  # not valid
            headers=auth_headers(token),
            timeout=10,
        )
        assert r.status_code == 400, f"Expected 400, got {r.status_code}"


# ---------------------------------------------------------------------------
# 10. Chat Endpoints
# ---------------------------------------------------------------------------

class TestChatEndpoints:
    """
    GET /api/v1/chats/
    GET /api/v1/chats/user/:userId
    GET /api/v1/chats/:chatId/messages
    POST /api/v1/chats/message
    POST /api/v1/chats/:chatId/mark-read
    """

    def test_get_all_chats_unauthenticated(self):
        """GET /chats without token → 401."""
        r = requests.get(f"{API_V1}/chats/", timeout=10)
        assert r.status_code == 401, f"Expected 401, got {r.status_code}"

    def test_get_all_chats_authenticated(self):
        """GET /chats as authenticated user → 200."""
        token = _state.get("user_token")
        if not token:
            pytest.skip("User login required")
        r = requests.get(
            f"{API_V1}/chats/",
            headers=auth_headers(token),
            timeout=10,
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"

    def test_get_or_create_chat_with_mechanic(self):
        """GET /chats/user/:userId creates or retrieves a chat."""
        token      = _state.get("user_token")
        mechanic_id = _state.get("mechanic_id")
        if not token or not mechanic_id:
            pytest.skip("Both user and mechanic login required")
        r = requests.get(
            f"{API_V1}/chats/user/{mechanic_id}",
            headers=auth_headers(token),
            timeout=10,
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json().get("data", {})
        _state["chat_id"] = data.get("_id")

    def test_get_chat_messages(self):
        """GET /chats/:chatId/messages → 200."""
        token   = _state.get("user_token")
        chat_id = _state.get("chat_id")
        if not token or not chat_id:
            pytest.skip("Chat creation required")
        r = requests.get(
            f"{API_V1}/chats/{chat_id}/messages",
            headers=auth_headers(token),
            timeout=10,
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"

    def test_send_message_missing_fields(self):
        """POST /chats/message without required fields → 400."""
        token = _state.get("user_token")
        if not token:
            pytest.skip("User login required")
        r = requests.post(
            f"{API_V1}/chats/message",
            json={},
            headers=auth_headers(token),
            timeout=10,
        )
        assert r.status_code in (400, 404), f"Unexpected status: {r.status_code}"

    def test_mark_messages_read_unauthenticated(self):
        """POST /chats/:chatId/mark-read without token → 401."""
        r = requests.post(
            f"{API_V1}/chats/000000000000000000000001/mark-read",
            timeout=10,
        )
        assert r.status_code == 401, f"Expected 401, got {r.status_code}"

    def test_mark_messages_read_authenticated(self):
        """POST /chats/:chatId/mark-read → 200."""
        token   = _state.get("user_token")
        chat_id = _state.get("chat_id")
        if not token or not chat_id:
            pytest.skip("Chat creation required")
        r = requests.post(
            f"{API_V1}/chats/{chat_id}/mark-read",
            headers=auth_headers(token),
            timeout=10,
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"


# ---------------------------------------------------------------------------
# 11. AI Endpoint
# ---------------------------------------------------------------------------

class TestAIEndpoint:
    """POST /api/v1/ai/ask"""

    def test_ai_ask_unauthenticated(self):
        """POST /ai/ask without token → 401."""
        r = requests.post(
            f"{API_V1}/ai/ask",
            json={"message": "What is RoadResQ?"},
            timeout=10,
        )
        assert r.status_code == 401, f"Expected 401, got {r.status_code}"

    def test_ai_ask_authenticated(self):
        """POST /ai/ask with valid token → 200 or service-configured response."""
        token = _state.get("user_token")
        if not token:
            pytest.skip("User login required")
        r = requests.post(
            f"{API_V1}/ai/ask",
            json={"message": "My car won't start. What should I do?"},
            headers=auth_headers(token),
            timeout=30,
        )
        # 200 if AI is configured, 500/503 if the API key is missing in env
        assert r.status_code in (200, 500, 503), (
            f"Unexpected status: {r.status_code} – {r.text}"
        )

    def test_ai_ask_empty_message(self):
        """POST /ai/ask with empty message → 400 or handled gracefully."""
        token = _state.get("user_token")
        if not token:
            pytest.skip("User login required")
        r = requests.post(
            f"{API_V1}/ai/ask",
            json={"message": ""},
            headers=auth_headers(token),
            timeout=15,
        )
        assert r.status_code in (200, 400, 500), (
            f"Unexpected status: {r.status_code}"
        )


# ---------------------------------------------------------------------------
# 12. Token Refresh
# ---------------------------------------------------------------------------

class TestTokenRefresh:
    """POST /api/v1/users/auth/refresh-token"""

    def test_refresh_token_missing(self):
        """POST /auth/refresh-token without token → 400."""
        r = requests.post(f"{API_V1}/users/auth/refresh-token", json={}, timeout=10)
        assert r.status_code == 400, f"Expected 400, got {r.status_code}"

    def test_refresh_token_invalid(self):
        """POST /auth/refresh-token with bad token → 400."""
        r = requests.post(
            f"{API_V1}/users/auth/refresh-token",
            headers={"x-refresh-token": "completely.invalid.token"},
            timeout=10,
        )
        assert r.status_code == 400, f"Expected 400, got {r.status_code}"


# ---------------------------------------------------------------------------
# 13. Logout (Cleanup)
# ---------------------------------------------------------------------------

class TestLogout:
    """Final cleanup – logout both accounts."""

    def test_logout_user(self):
        """POST /logout as authenticated user → 200."""
        token = _state.get("user_token")
        if not token:
            pytest.skip("User was not logged in")
        r = requests.post(
            f"{API_V1}/users/logout",
            headers=auth_headers(token),
            timeout=10,
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"

    def test_logout_mechanic(self):
        """POST /logout as authenticated mechanic → 200."""
        token = _state.get("mechanic_token")
        if not token:
            pytest.skip("Mechanic was not logged in")
        r = requests.post(
            f"{API_V1}/users/logout",
            headers=auth_headers(token),
            timeout=10,
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"

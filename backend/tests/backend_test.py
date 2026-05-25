"""AutoVisor backend API tests"""
import os
import time
import uuid
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://dual-product-store.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@autovisor.com.br")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "Admin@AutoVisor2026")

CUSTOMER_EMAIL = f"TEST_cliente_{uuid.uuid4().hex[:8]}@example.com"
CUSTOMER_PASSWORD = os.environ.get("TEST_CUSTOMER_PASSWORD", "Teste@2026")
VALID_CPF = "390.533.447-05"


@pytest.fixture(scope="session")
def customer_session():
    s = requests.Session()
    payload = {
        "email": CUSTOMER_EMAIL,
        "password": CUSTOMER_PASSWORD,
        "full_name": "Cliente Teste da Silva",
        "cpf": VALID_CPF,
        "phone": "(11) 98765-4321",
        "cep": "01310-100",
        "address_street": "Av. Paulista",
        "address_number": "1000",
        "address_complement": "",
        "address_neighborhood": "Bela Vista",
        "address_city": "São Paulo",
        "address_state": "SP",
        "birth_date": "1990-01-15",
    }
    r = s.post(f"{API}/auth/register", json=payload)
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="session")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"admin login failed: {r.text}"
    return s


# ----- Products -----
class TestProducts:
    def test_list_products(self):
        r = requests.get(f"{API}/products")
        assert r.status_code == 200
        data = r.json()
        ids = {p["id"] for p in data}
        assert {"hud-c3-navigation", "hud-c3-alarms"} <= ids
        assert len(data) == 2

    def test_get_navigation(self):
        r = requests.get(f"{API}/products/hud-c3-navigation")
        assert r.status_code == 200
        assert r.json()["edition"] == "navigation"

    def test_get_alarms(self):
        r = requests.get(f"{API}/products/hud-c3-alarms")
        assert r.status_code == 200
        assert r.json()["edition"] == "alarms"

    def test_get_invalid_product(self):
        r = requests.get(f"{API}/products/not-exist")
        assert r.status_code == 404


# ----- Auth -----
class TestAuth:
    def test_register_and_cookie(self, customer_session):
        # cookie should be set
        assert customer_session.cookies.get("access_token"), "access_token cookie not set"

    def test_register_duplicate(self, customer_session):
        payload = {
            "email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD,
            "full_name": "X", "cpf": VALID_CPF, "phone": "1",
            "cep": "01310-100", "address_street": "X", "address_number": "1",
            "address_neighborhood": "X", "address_city": "X", "address_state": "SP",
        }
        r = requests.post(f"{API}/auth/register", json=payload)
        assert r.status_code == 409

    def test_login_admin(self, admin_session):
        r = admin_session.get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json()["role"] == "admin"

    def test_login_customer(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD})
        assert r.status_code == 200
        assert s.cookies.get("access_token")
        me = s.get(f"{API}/auth/me")
        assert me.status_code == 200
        assert me.json()["email"] == CUSTOMER_EMAIL.lower()
        assert me.json()["role"] == "customer"

    def test_login_invalid(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
        assert r.status_code == 401

    def test_me_unauth(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_logout(self):
        s = requests.Session()
        s.post(f"{API}/auth/login", json={"email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD})
        assert s.cookies.get("access_token")
        r = s.post(f"{API}/auth/logout")
        assert r.status_code == 200
        # After logout the Set-Cookie should clear; subsequent /me must be 401
        s.cookies.clear()
        me = s.get(f"{API}/auth/me")
        assert me.status_code == 401


# ----- CEP -----
class TestCep:
    def test_cep_valid(self):
        r = requests.get(f"{API}/cep/01310100")
        assert r.status_code == 200
        d = r.json()
        for k in ("street", "neighborhood", "city", "state"):
            assert k in d
        assert d["state"] == "SP"
        assert d["city"].lower().startswith("são paulo") or "Paulo" in d["city"]

    def test_cep_invalid_format(self):
        r = requests.get(f"{API}/cep/123")
        assert r.status_code == 400


# ----- Orders -----
class TestOrders:
    def test_create_order_unauth(self):
        r = requests.post(f"{API}/orders", json={"items": [], "payment_method": "pix", "shipping": {}})
        assert r.status_code in (401, 422)

    def test_create_pix_order(self, customer_session):
        payload = {
            "items": [{"product_id": "hud-c3-navigation", "quantity": 2}],
            "payment_method": "pix",
            "shipping": {
                "full_name": "Cliente Teste", "cpf": VALID_CPF, "birth_date": "1990-01-15",
                "phone": "(11) 98765-4321", "cep": "01310-100", "street": "Av. Paulista",
                "number": "1000", "complement": "", "neighborhood": "Bela Vista",
                "city": "São Paulo", "state": "SP",
            },
        }
        r = customer_session.post(f"{API}/orders", json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        # subtotal = 2 * 29700 = 59400, discount = 5% = 2970
        assert d["subtotal"] == 59400
        assert d["discount"] == 2970
        assert d["total"] == 56430
        assert d["payment_method"] == "pix"
        assert d["pix_code"]
        assert d["status"] == "aguardando_pagamento"
        # Verify persistence
        g = customer_session.get(f"{API}/orders/{d['id']}")
        assert g.status_code == 200
        assert g.json()["id"] == d["id"]

    def test_create_card_order(self, customer_session):
        payload = {
            "items": [{"product_id": "hud-c3-alarms", "quantity": 1}],
            "payment_method": "card",
            "shipping": {
                "full_name": "Cliente Teste", "cpf": VALID_CPF, "birth_date": "1990-01-15",
                "phone": "(11) 98765-4321", "cep": "01310-100", "street": "Av. Paulista",
                "number": "1000", "complement": "", "neighborhood": "Bela Vista",
                "city": "São Paulo", "state": "SP",
            },
            "card": {"holder_name": "CLIENTE TESTE", "number": "4111111111111234",
                     "expiry": "12/30", "cvv": "123", "installments": 3},
        }
        r = customer_session.post(f"{API}/orders", json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["card_last4"] == "1234"
        assert d["card_installments"] == 3
        assert d["discount"] == 0
        assert d["total"] == 29700
        assert d["status"] == "pago"

    def test_card_missing_card_data(self, customer_session):
        payload = {
            "items": [{"product_id": "hud-c3-alarms", "quantity": 1}],
            "payment_method": "card",
            "shipping": {
                "full_name": "X", "cpf": VALID_CPF, "birth_date": "1990-01-15",
                "phone": "1", "cep": "01310-100", "street": "X", "number": "1",
                "complement": "", "neighborhood": "X", "city": "X", "state": "SP",
            },
        }
        r = customer_session.post(f"{API}/orders", json=payload)
        assert r.status_code == 400

    def test_my_orders(self, customer_session):
        r = customer_session.get(f"{API}/orders")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 2


# ----- Admin -----
class TestAdmin:
    def test_admin_orders_forbidden_for_customer(self, customer_session):
        r = customer_session.get(f"{API}/admin/orders")
        assert r.status_code == 403

    def test_admin_orders_ok(self, admin_session):
        r = admin_session.get(f"{API}/admin/orders")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_admin_stats(self, admin_session):
        r = admin_session.get(f"{API}/admin/stats")
        assert r.status_code == 200
        d = r.json()
        for k in ("orders_count", "revenue_cents", "users_count"):
            assert k in d

    def test_admin_stats_forbidden(self, customer_session):
        r = customer_session.get(f"{API}/admin/stats")
        assert r.status_code == 403

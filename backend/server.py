from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import secrets
import asyncio
import logging
import bcrypt
import jwt
import httpx
import resend
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field

# --- DB ---
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# --- JWT ---
JWT_ALG = "HS256"

def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]

def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(pw: str, hashed: str) -> bool:
    return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))

def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {"sub": user_id, "email": email, "role": role,
               "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALG)

def set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key="access_token", value=token, httponly=True,
        secure=True, samesite="none", max_age=604800, path="/"
    )

# --- App / router ---
app = FastAPI(title="AutoVisor API")
api_router = APIRouter(prefix="/api")

# --- Models ---
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    full_name: str
    cpf: str
    phone: str
    cep: str
    address_street: str
    address_number: str
    address_complement: Optional[str] = ""
    address_neighborhood: str
    address_city: str
    address_state: str
    birth_date: Optional[str] = None

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    cpf: str
    phone: str
    cep: str
    address_street: str
    address_number: str
    address_complement: Optional[str] = ""
    address_neighborhood: str
    address_city: str
    address_state: str
    birth_date: Optional[str] = None
    role: str
    email_verified: bool = False
    created_at: str

class VerifyEmailIn(BaseModel):
    token: str

class CartItemIn(BaseModel):
    product_id: str
    quantity: int = Field(ge=1)

class ShippingIn(BaseModel):
    full_name: str
    cpf: str
    birth_date: str
    phone: str
    cep: str
    street: str
    number: str
    complement: Optional[str] = ""
    neighborhood: str
    city: str
    state: str

class CardIn(BaseModel):
    holder_name: str
    number: str
    expiry: str
    cvv: str
    installments: int = 1

class OrderCreateIn(BaseModel):
    items: List[CartItemIn]
    payment_method: Literal["pix", "card"]
    shipping: ShippingIn
    card: Optional[CardIn] = None
    coupon_code: Optional[str] = None

class CouponValidateIn(BaseModel):
    code: str

# --- Auth dependency ---
async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Não autenticado")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Sessão expirada")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")
    return user

async def admin_required(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso restrito ao administrador")
    return user

def _get_frontend_url() -> str:
    return os.environ.get("FRONTEND_URL", "https://hudhub.com.br").rstrip("/")

def _build_verify_email_html(full_name: str, verify_url: str) -> str:
    return f"""<!doctype html>
<html><body style="margin:0;padding:0;background:#f5f5f7;font-family:Arial,sans-serif;color:#1c1c1e;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:24px 0;">
<tr><td align="center">
  <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e5e7;">
    <tr><td style="background:#0F0F12;padding:24px;">
      <span style="color:#FF9500;font-size:22px;font-weight:700;">AutoVisor.</span>
    </td></tr>
    <tr><td style="padding:32px;">
      <h1 style="margin:0;font-size:24px;color:#1c1c1e;">Confirme seu e-mail</h1>
      <p style="color:#525252;line-height:1.6;">Olá {full_name}, falta só uma etapa para concluir seu cadastro. Clique no botão abaixo para confirmar que este é o seu e-mail.</p>
      <p style="margin:32px 0;">
        <a href="{verify_url}" style="display:inline-block;padding:14px 28px;background:#FF9500;color:#0F0F12;text-decoration:none;font-weight:700;">Confirmar meu e-mail</a>
      </p>
      <p style="color:#71717a;font-size:13px;line-height:1.6;">Se o botão não funcionar, copie e cole este link no navegador:<br/>
        <span style="word-break:break-all;color:#3b3b3f;">{verify_url}</span>
      </p>
      <p style="color:#a1a1aa;font-size:12px;margin-top:24px;">Se você não criou conta na AutoVisor, ignore este e-mail.</p>
    </td></tr>
    <tr><td style="background:#0F0F12;padding:20px 32px;color:#a1a1aa;font-size:12px;">
      AutoVisor Tecnologia LTDA · contato@autovisor.com.br
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>"""

async def _send_verify_email(email: str, full_name: str, token: str) -> None:
    api_key = os.environ.get("RESEND_API_KEY", "").strip()
    sender = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
    verify_url = f"{_get_frontend_url()}/confirmar-email/{token}"
    html = _build_verify_email_html(full_name, verify_url)
    subject = "AutoVisor — Confirme seu e-mail"
    if not api_key:
        logger.info("[VERIFY EMAIL MOCK] to=%s url=%s", email, verify_url)
        return
    try:
        resend.api_key = api_key
        await asyncio.to_thread(resend.Emails.send, {
            "from": sender, "to": [email], "subject": subject, "html": html,
        })
        logger.info("[VERIFY EMAIL SENT] to=%s", email)
    except Exception as e:
        logger.error("[VERIFY EMAIL ERROR] %s", e)

# --- Auth endpoints ---
@api_router.post("/auth/register", response_model=UserOut)
async def register(payload: RegisterIn, response: Response):
    email = payload.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=409, detail="Este e-mail já está cadastrado")
    user_id = str(uuid.uuid4())
    verification_token = secrets.token_urlsafe(32)
    doc = {
        "id": user_id,
        "email": email,
        "password_hash": hash_password(payload.password),
        "full_name": payload.full_name.strip(),
        "cpf": payload.cpf.strip(),
        "phone": payload.phone.strip(),
        "cep": payload.cep.strip(),
        "address_street": payload.address_street.strip(),
        "address_number": payload.address_number.strip(),
        "address_complement": (payload.address_complement or "").strip(),
        "address_neighborhood": payload.address_neighborhood.strip(),
        "address_city": payload.address_city.strip(),
        "address_state": payload.address_state.strip(),
        "birth_date": payload.birth_date or "",
        "role": "customer",
        "email_verified": False,
        "verification_token": verification_token,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    token = create_access_token(user_id, email, "customer")
    set_auth_cookie(response, token)
    asyncio.create_task(_send_verify_email(email, doc["full_name"], verification_token))
    doc.pop("password_hash", None)
    doc.pop("verification_token", None)
    doc.pop("_id", None)
    return doc

@api_router.post("/auth/login", response_model=UserOut)
async def login(payload: LoginIn, response: Response):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="E-mail ou senha incorretos")
    token = create_access_token(user["id"], user["email"], user.get("role", "customer"))
    set_auth_cookie(response, token)
    user.pop("password_hash", None)
    user.pop("verification_token", None)
    user.setdefault("email_verified", False)
    return user

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/", samesite="none", secure=True)
    return {"ok": True}

@api_router.get("/auth/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    user.setdefault("email_verified", False)
    user.pop("verification_token", None)
    return user

@api_router.post("/auth/verify-email", response_model=UserOut)
async def verify_email(payload: VerifyEmailIn, response: Response):
    user = await db.users.find_one({"verification_token": payload.token}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Link de confirmação inválido ou expirado")
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"email_verified": True}, "$unset": {"verification_token": ""}}
    )
    # Re-auth so the cookie reflects verified user
    new_token = create_access_token(user["id"], user["email"], user.get("role", "customer"))
    set_auth_cookie(response, new_token)
    user["email_verified"] = True
    user.pop("password_hash", None)
    user.pop("verification_token", None)
    return user

@api_router.post("/auth/resend-verification")
async def resend_verification(user: dict = Depends(get_current_user)):
    if user.get("email_verified"):
        return {"ok": True, "already_verified": True}
    token = secrets.token_urlsafe(32)
    await db.users.update_one({"id": user["id"]}, {"$set": {"verification_token": token}})
    asyncio.create_task(_send_verify_email(user["email"], user.get("full_name", ""), token))
    return {"ok": True}

# --- Products ---
PRODUCTS = [
    {
        "id": "hud-c3-navigation",
        "slug": "hud-c3-navigation",
        "name": "HUD C3 — Edição Navegação",
        "tagline": "GPS + OBD com navegação inteligente e alerta de velocidade por IA",
        "edition": "navigation",
        "price": 42500,  # full price (display + import tax)
        "display_price": 35700,  # shown on store/cards (= price - import_tax)
        "import_tax_cents": 6800,  # R$ 68 import tax
        "compare_price": 59900,
        "stock": 25,
        "rating": 4.8,
        "reviews": 1247,
        "short_description": (
            "Head-Up Display automotivo C3 com sistema híbrido OBD+GPS. "
            "Projeta dados do veículo e navegação direto no para-brisa, "
            "com alertas inteligentes de excesso de velocidade."
        ),
        "highlights": [
            "Navegação por GPS integrada (Google Maps)",
            "Leitura OBD-II do computador de bordo",
            "Alerta inteligente de excesso de velocidade (IA)",
            "Tela colorida HD anti-reflexo",
            "Compatível com 99% dos veículos pós-2008",
        ],
        "unique_features": [
            {"title": "Navegação no para-brisa", "desc": "Sincroniza com o Google Maps do seu celular e projeta setas, distância e nome da rua direto no seu campo de visão."},
            {"title": "Alerta de velocidade por IA", "desc": "Compara sua velocidade com o limite da via em tempo real e dispara alerta visual quando você ultrapassa."},
            {"title": "Sistema duplo OBD + GPS", "desc": "Combina dados do computador do carro com dados via satélite para máxima precisão."},
        ],
        "image_captions": [
            "Tela principal — navegação com setas e limite de velocidade projetados.",
            "Tecnologia anti-fantasma — projeção nítida sem reflexos duplicados no para-brisa.",
            "Design compacto que se acomoda no painel sem atrapalhar a visão.",
            "Várias telas disponíveis — escolha as informações que mais importam para você.",
        ],
        "specs": {
            "Modelo": "C3 Navigation Edition",
            "Display": "Tela colorida TFT 2.2\" anti-reflexo",
            "Conectividade": "OBD-II + GPS dedicado",
            "Dados exibidos": "Velocidade, RPM, distância, tempo, direção",
            "Alertas": "Excesso de velocidade por IA, atenção do motorista",
            "Mapas": "Compatível com Google Maps",
            "Alimentação": "12V via OBD-II (plug and play)",
            "Idiomas": "Português, Inglês, Espanhol",
            "Dimensões": "95 × 75 × 18 mm",
            "Garantia": "12 meses",
        },
        "images": [
            "https://ae-pic-a1.aliexpress-media.com/kf/S013b4f367f304469b5a4cbf34f5d7eb5d.jpg_960x960q75.jpg_.avif",
            "https://ae-pic-a1.aliexpress-media.com/kf/S0c91bfa0d9cd48f0a927556fd0b264baN.jpg_960x960q75.jpg_.avif",
            "https://ae-pic-a1.aliexpress-media.com/kf/S7558d387a52a4b16a00a610ec07f0500r.jpg_960x960q75.jpg_.avif",
            "https://ae-pic-a1.aliexpress-media.com/kf/S0f5fb3a80dfd4994bdf290b76729b721A.jpg_960x960q75.jpg_.avif",
        ],
    },
    {
        "id": "hud-c3-alarms",
        "slug": "hud-c3-alarms",
        "name": "HUD C3 — Edição Multi-Alarmes",
        "tagline": "Monitoramento completo do veículo com 6 alarmes inteligentes",
        "edition": "alarms",
        "price": 42500,
        "display_price": 35700,
        "import_tax_cents": 6800,
        "compare_price": 59900,
        "stock": 30,
        "rating": 4.9,
        "reviews": 982,
        "short_description": (
            "Mesma plataforma C3 com firmware focado em diagnóstico veicular. "
            "Exibe RPM, temperatura, voltagem e dispara 6 alarmes inteligentes "
            "para máxima segurança e prevenção."
        ),
        "highlights": [
            "6 alarmes inteligentes (velocidade, RPM, voltagem, temperatura, fadiga, DTC)",
            "Leitura em tempo real do OBD-II",
            "Detecção de códigos de erro (DTC) do motor",
            "Alerta de fadiga após 2h de direção",
            "Tela colorida HD com gráficos de barras",
        ],
        "unique_features": [
            {"title": "6 alarmes inteligentes", "desc": "Avisa quando há excesso de velocidade, RPM alto, voltagem baixa, motor superaquecido, fadiga do motorista e códigos de erro."},
            {"title": "Diagnóstico DTC do motor", "desc": "Lê os códigos de falha (Diagnostic Trouble Codes) e mostra exatamente o que o motor está sinalizando — sem precisar ir ao mecânico só para descobrir o que é a 'luz de injeção'."},
            {"title": "Detector de fadiga", "desc": "Após 2 horas contínuas de direção, dispara alerta para você fazer uma pausa — reduzindo risco de acidentes por sonolência."},
        ],
        "image_captions": [
            "Tela com múltiplos alarmes — velocidade, RPM, temperatura e voltagem em tempo real.",
            "Visualização dos dados do carro com barras coloridas e alertas instantâneos.",
            "Design compacto que se acomoda no painel sem atrapalhar a visão.",
            "Várias telas disponíveis — alterne entre visões resumidas e detalhadas.",
        ],
        "specs": {
            "Modelo": "C3 Multi-Alarms Edition",
            "Display": "Tela colorida TFT 2.2\" anti-reflexo",
            "Conectividade": "OBD-II",
            "Dados exibidos": "Velocidade, RPM, ECT, voltagem, consumo",
            "Alarmes": "Excesso de velocidade, RPM alto, voltagem, temperatura, fadiga, DTC",
            "Diagnóstico": "Leitura de códigos DTC do motor",
            "Alimentação": "12V via OBD-II (plug and play)",
            "Idiomas": "Português, Inglês, Espanhol",
            "Dimensões": "95 × 75 × 18 mm",
            "Garantia": "12 meses",
        },
        "images": [
            "https://ae-pic-a1.aliexpress-media.com/kf/S57daa2e1cfe3446a91cc24df049549829.jpg_960x960q75.jpg_.avif",
            "https://ae-pic-a1.aliexpress-media.com/kf/Sc8be146fedd54811ac950889fcaed29b1.jpg_960x960q75.jpg_.avif",
            "https://ae-pic-a1.aliexpress-media.com/kf/S7558d387a52a4b16a00a610ec07f0500r.jpg_960x960q75.jpg_.avif",
            "https://ae-pic-a1.aliexpress-media.com/kf/S0f5fb3a80dfd4994bdf290b76729b721A.jpg_960x960q75.jpg_.avif",
        ],
    },
]

# Universal compatibility for both editions (OBD-II 12V vehicles, 2008+)
COMPATIBILITY = {
    "summary": "Funciona em 99% dos veículos com porta OBD-II padrão (2008 em diante). Instalação plug and play em menos de 30 segundos.",
    "brands": [
        {"name": "Volkswagen", "models": "Gol, Polo, Voyage, Virtus, T-Cross, Nivus, Jetta, Saveiro, Amarok"},
        {"name": "Chevrolet", "models": "Onix, Prisma, Tracker, S10, Cruze, Spin, Cobalt, Montana"},
        {"name": "Fiat", "models": "Argo, Cronos, Mobi, Strada, Toro, Pulse, Fastback, Uno"},
        {"name": "Hyundai", "models": "HB20, Creta, Tucson, i30, Santa Fe"},
        {"name": "Toyota", "models": "Corolla, Yaris, Hilux, SW4, RAV4, Etios"},
        {"name": "Honda", "models": "Civic, City, Fit, HR-V, WR-V, CR-V"},
        {"name": "Ford", "models": "Ka, EcoSport, Ranger, Territory, Bronco"},
        {"name": "Renault", "models": "Kwid, Sandero, Logan, Duster, Captur, Oroch"},
        {"name": "Jeep", "models": "Renegade, Compass, Commander, Wrangler"},
        {"name": "Nissan", "models": "Versa, Kicks, Frontier, March, Sentra"},
        {"name": "Peugeot", "models": "208, 2008, 3008, Partner"},
        {"name": "Citroën", "models": "C3, C4 Cactus, Aircross, Berlingo"},
    ],
    "not_compatible": [
        "Veículos anteriores a 2008 sem porta OBD-II",
        "Caminhões/ônibus que utilizam padrão J1939 em vez de OBD-II",
        "Motos (utilizam conector próprio)",
    ],
}

for _p in PRODUCTS:
    _p["compatibility"] = COMPATIBILITY

PRODUCTS_BY_ID = {p["id"]: p for p in PRODUCTS}

@api_router.get("/products")
async def list_products():
    return PRODUCTS

@api_router.get("/products/{product_id}")
async def get_product(product_id: str):
    p = PRODUCTS_BY_ID.get(product_id)
    if not p:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return p

# --- ViaCEP proxy ---
@api_router.get("/cep/{cep}")
async def lookup_cep(cep: str):
    clean = "".join(c for c in cep if c.isdigit())
    if len(clean) != 8:
        raise HTTPException(status_code=400, detail="CEP inválido")
    async with httpx.AsyncClient(timeout=10) as cli:
        r = await cli.get(f"https://viacep.com.br/ws/{clean}/json/")
    data = r.json()
    if data.get("erro"):
        raise HTTPException(status_code=404, detail="CEP não encontrado")
    return {
        "cep": data.get("cep", ""),
        "street": data.get("logradouro", ""),
        "neighborhood": data.get("bairro", ""),
        "city": data.get("localidade", ""),
        "state": data.get("uf", ""),
    }

# --- Coupons (MongoDB-backed) ---
DEFAULT_COUPONS = [
    {"code": "BEMVINDO25", "type": "fixed", "amount_cents": 2500, "amount_percent": 0,
     "description": "R$ 25 de desconto de boas-vindas",
     "max_uses": 0, "uses": 0, "active": True, "expires_at": None,
     "one_per_customer": True},
]

async def _seed_default_coupons():
    for c in DEFAULT_COUPONS:
        existing = await db.coupons.find_one({"code": c["code"]})
        if not existing:
            await db.coupons.insert_one({**c, "created_at": datetime.now(timezone.utc).isoformat()})

async def _get_coupon(code: str) -> Optional[dict]:
    return await db.coupons.find_one({"code": code.strip().upper()}, {"_id": 0})

async def _user_used_coupon(user_id: str, code: str) -> bool:
    found = await db.orders.find_one({"user_id": user_id, "coupon_code": code})
    return found is not None

def _coupon_is_valid(coupon: dict) -> Optional[str]:
    if not coupon.get("active"):
        return "Cupom desativado"
    if coupon.get("expires_at"):
        try:
            exp = datetime.fromisoformat(coupon["expires_at"])
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) > exp:
                return "Cupom expirado"
        except Exception:
            pass
    if coupon.get("max_uses") and coupon["max_uses"] > 0 and coupon.get("uses", 0) >= coupon["max_uses"]:
        return "Cupom esgotado"
    return None

def _coupon_discount(coupon: dict, subtotal: int) -> int:
    if coupon.get("type") == "percent":
        return min(subtotal, round(subtotal * coupon.get("amount_percent", 0) / 100))
    return min(subtotal, coupon.get("amount_cents", 0))

@api_router.post("/coupons/validate")
async def validate_coupon(payload: CouponValidateIn, user: dict = Depends(get_current_user)):
    coupon = await _get_coupon(payload.code)
    if not coupon:
        raise HTTPException(status_code=404, detail="Cupom inválido ou expirado")
    err = _coupon_is_valid(coupon)
    if err:
        raise HTTPException(status_code=400, detail=err)
    if coupon.get("one_per_customer") and await _user_used_coupon(user["id"], coupon["code"]):
        raise HTTPException(status_code=400, detail="Você já utilizou este cupom")
    return coupon

class CouponCreateIn(BaseModel):
    code: str
    type: Literal["fixed", "percent"] = "fixed"
    amount_cents: int = 0
    amount_percent: int = 0
    description: str = ""
    max_uses: int = 0
    active: bool = True
    expires_at: Optional[str] = None
    one_per_customer: bool = True

@api_router.get("/admin/coupons")
async def admin_list_coupons(_: dict = Depends(admin_required)):
    docs = await db.coupons.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs

@api_router.post("/admin/coupons")
async def admin_create_coupon(payload: CouponCreateIn, _: dict = Depends(admin_required)):
    code = payload.code.strip().upper()
    if not code:
        raise HTTPException(status_code=400, detail="Código obrigatório")
    if await db.coupons.find_one({"code": code}):
        raise HTTPException(status_code=409, detail="Já existe um cupom com esse código")
    doc = {
        "code": code,
        "type": payload.type,
        "amount_cents": payload.amount_cents,
        "amount_percent": payload.amount_percent,
        "description": payload.description.strip(),
        "max_uses": payload.max_uses,
        "uses": 0,
        "active": payload.active,
        "expires_at": payload.expires_at,
        "one_per_customer": payload.one_per_customer,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.coupons.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.patch("/admin/coupons/{code}")
async def admin_update_coupon(code: str, payload: dict, _: dict = Depends(admin_required)):
    code = code.strip().upper()
    allowed = {"active", "description", "max_uses", "expires_at", "amount_cents", "amount_percent", "one_per_customer"}
    update = {k: v for k, v in payload.items() if k in allowed}
    if not update:
        raise HTTPException(status_code=400, detail="Nenhum campo válido para atualizar")
    res = await db.coupons.update_one({"code": code}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Cupom não encontrado")
    doc = await db.coupons.find_one({"code": code}, {"_id": 0})
    return doc

@api_router.delete("/admin/coupons/{code}")
async def admin_delete_coupon(code: str, _: dict = Depends(admin_required)):
    code = code.strip().upper()
    res = await db.coupons.delete_one({"code": code})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cupom não encontrado")
    return {"ok": True}

# --- Analytics events ---
class EventIn(BaseModel):
    type: Literal["view_home", "view_product", "add_to_cart", "begin_checkout"]
    product_id: Optional[str] = None
    session_id: Optional[str] = None

@api_router.post("/events")
async def track_event(payload: EventIn, request: Request):
    user_id = None
    token = request.cookies.get("access_token")
    if token:
        try:
            pl = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALG])
            user_id = pl.get("sub")
        except Exception:
            pass
    doc = {
        "id": str(uuid.uuid4()),
        "type": payload.type,
        "product_id": payload.product_id,
        "session_id": payload.session_id or "anon",
        "user_id": user_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.events.insert_one(doc)
    return {"ok": True}

@api_router.get("/admin/funnel")
async def admin_funnel(days: int = 30, _: dict = Depends(admin_required)):
    days = max(1, min(days, 365))
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    async def _distinct_sessions(event_type: str, extra: Optional[dict] = None) -> int:
        match = {"type": event_type, "created_at": {"$gte": since}}
        if extra:
            match.update(extra)
        pipe = [{"$match": match}, {"$group": {"_id": "$session_id"}}, {"$count": "n"}]
        out = await db.events.aggregate(pipe).to_list(1)
        return out[0]["n"] if out else 0

    home = await _distinct_sessions("view_home")
    pv = await _distinct_sessions("view_product")
    pv_nav = await _distinct_sessions("view_product", {"product_id": "hud-c3-navigation"})
    pv_alarm = await _distinct_sessions("view_product", {"product_id": "hud-c3-alarms"})
    cart = await _distinct_sessions("add_to_cart")
    cart_nav = await _distinct_sessions("add_to_cart", {"product_id": "hud-c3-navigation"})
    cart_alarm = await _distinct_sessions("add_to_cart", {"product_id": "hud-c3-alarms"})
    begin_ck = await _distinct_sessions("begin_checkout")

    orders = await db.orders.find({"created_at": {"$gte": since}}, {"_id": 0}).to_list(5000)
    orders_count = len(orders)
    paid_orders = [o for o in orders if o.get("status") == "pago"]
    paid_count = len(paid_orders)
    revenue = sum(o.get("total", 0) for o in paid_orders)
    avg_ticket = round(revenue / paid_count) if paid_count else 0
    coupons_used = sum(1 for o in orders if o.get("coupon_code"))
    coupon_usage_rate = round((coupons_used / orders_count) * 100, 1) if orders_count else 0.0

    orders_by_edition = {"navigation": 0, "alarms": 0}
    for o in paid_orders:
        for it in o.get("items", []):
            ed = it.get("edition")
            if ed in orders_by_edition:
                orders_by_edition[ed] += it.get("quantity", 0)

    def _pct(a: int, b: int) -> float:
        return round((a / b) * 100, 1) if b else 0.0

    return {
        "days": days,
        "since": since,
        "funnel": [
            {"key": "home", "label": "Visitas à home", "count": home, "conv_from_prev": None},
            {"key": "product_view", "label": "Visitas a produto", "count": pv, "conv_from_prev": _pct(pv, home)},
            {"key": "add_to_cart", "label": "Adicionados ao carrinho", "count": cart, "conv_from_prev": _pct(cart, pv)},
            {"key": "begin_checkout", "label": "Checkout iniciado", "count": begin_ck, "conv_from_prev": _pct(begin_ck, cart)},
            {"key": "orders", "label": "Pedidos criados", "count": orders_count, "conv_from_prev": _pct(orders_count, begin_ck)},
            {"key": "paid", "label": "Pedidos pagos", "count": paid_count, "conv_from_prev": _pct(paid_count, orders_count)},
        ],
        "overall_conversion_pct": _pct(paid_count, home),
        "by_edition": {
            "navigation": {"views": pv_nav, "carts": cart_nav, "units_sold": orders_by_edition["navigation"]},
            "alarms": {"views": pv_alarm, "carts": cart_alarm, "units_sold": orders_by_edition["alarms"]},
        },
        "revenue_cents": revenue,
        "avg_ticket_cents": avg_ticket,
        "coupons_used": coupons_used,
        "coupon_usage_rate_pct": coupon_usage_rate,
    }

# --- Orders ---
async def _resolve_coupon(user_id: Optional[str], code: Optional[str]) -> Optional[dict]:
    if not code:
        return None
    coupon = await _get_coupon(code)
    if not coupon:
        raise HTTPException(status_code=400, detail="Cupom inválido")
    err = _coupon_is_valid(coupon)
    if err:
        raise HTTPException(status_code=400, detail=err)
    if user_id and coupon.get("one_per_customer") and await _user_used_coupon(user_id, coupon["code"]):
        raise HTTPException(status_code=400, detail="Você já utilizou este cupom")
    return coupon

def _compute_total(items: List[CartItemIn], payment_method: str, coupon: Optional[dict] = None) -> dict:
    products_total = 0  # sum of display_price * qty
    import_tax_total = 0  # sum of import_tax_cents * qty
    detailed = []
    for it in items:
        p = PRODUCTS_BY_ID.get(it.product_id)
        if not p:
            raise HTTPException(status_code=400, detail=f"Produto inválido: {it.product_id}")
        display_price = p.get("display_price", p["price"])
        import_tax = p.get("import_tax_cents", 0)
        line_products = display_price * it.quantity
        line_tax = import_tax * it.quantity
        products_total += line_products
        import_tax_total += line_tax
        detailed.append({
            "product_id": p["id"],
            "name": p["name"],
            "edition": p["edition"],
            "unit_price": p["price"],
            "display_price": display_price,
            "import_tax_cents": import_tax,
            "quantity": it.quantity,
            "line_total": line_products + line_tax,
            "image": p["images"][0],
        })
    subtotal = products_total + import_tax_total  # = R$ 425 per unit
    coupon_discount = 0
    if coupon:
        coupon_discount = _coupon_discount(coupon, subtotal)
    after_coupon = subtotal - coupon_discount
    pix_discount = 0
    if payment_method == "pix":
        pix_discount = round(after_coupon * 0.05)
    shipping = 0  # free
    discount = coupon_discount + pix_discount
    total = subtotal - discount + shipping
    return {
        "items": detailed,
        "products_total": products_total,
        "import_tax_total": import_tax_total,
        "subtotal": subtotal,
        "coupon_discount": coupon_discount,
        "pix_discount": pix_discount,
        "discount": discount,
        "shipping": shipping,
        "total": total,
    }

# --- Email sending ---
def _format_brl(cents: int) -> str:
    return f"R$ {cents/100:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

def _build_order_email_html(order: dict) -> str:
    items_rows = "".join(
        f"""<tr>
              <td style="padding:12px;border-bottom:1px solid #eee;">{it['quantity']}× {it['name']}</td>
              <td style="padding:12px;border-bottom:1px solid #eee;text-align:right;font-family:monospace;">{_format_brl(it['line_total'])}</td>
            </tr>"""
        for it in order["items"]
    )
    payment_label = "PIX" if order["payment_method"] == "pix" else f"Cartão final {order.get('card_last4','****')}"
    coupon_row = ""
    if order.get("coupon_code"):
        coupon_row = f"""<tr><td style="padding:6px 12px;color:#32BCAD;">Cupom {order['coupon_code']}</td>
            <td style="padding:6px 12px;text-align:right;font-family:monospace;color:#32BCAD;">-{_format_brl(order.get('coupon_discount',0))}</td></tr>"""
    pix_row = ""
    if order.get("pix_discount", 0) > 0:
        pix_row = f"""<tr><td style="padding:6px 12px;color:#32BCAD;">Desconto PIX (-5%)</td>
            <td style="padding:6px 12px;text-align:right;font-family:monospace;color:#32BCAD;">-{_format_brl(order['pix_discount'])}</td></tr>"""
    s = order["shipping_data"]
    return f"""<!doctype html>
<html><body style="margin:0;padding:0;background:#f5f5f7;font-family:Arial,sans-serif;color:#1c1c1e;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:24px 0;">
<tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e5e7;">
    <tr><td style="background:#0F0F12;padding:24px;">
      <span style="color:#FF9500;font-size:22px;font-weight:700;">AutoVisor.</span>
    </td></tr>
    <tr><td style="padding:32px 32px 8px;">
      <h1 style="margin:0;font-size:24px;color:#1c1c1e;">Pedido confirmado!</h1>
      <p style="color:#525252;margin:8px 0 0;">Olá {s['full_name']}, recebemos seu pedido <strong>{order['order_number']}</strong>.</p>
    </td></tr>
    <tr><td style="padding:24px 32px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e5e7;">
        <tr><td style="background:#fafafa;padding:12px;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#71717a;">Itens</td>
            <td style="background:#fafafa;padding:12px;text-align:right;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#71717a;">Total</td></tr>
        {items_rows}
        <tr><td style="padding:6px 12px;color:#71717a;">Subtotal</td>
            <td style="padding:6px 12px;text-align:right;font-family:monospace;">{_format_brl(order['subtotal'])}</td></tr>
        {coupon_row}
        {pix_row}
        <tr><td style="padding:12px;border-top:2px solid #1c1c1e;font-weight:700;">Total</td>
            <td style="padding:12px;border-top:2px solid #1c1c1e;text-align:right;font-family:monospace;font-weight:700;">{_format_brl(order['total'])}</td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:0 32px 24px;">
      <h3 style="font-size:14px;color:#71717a;text-transform:uppercase;letter-spacing:0.1em;">Entrega</h3>
      <p style="margin:6px 0;color:#1c1c1e;line-height:1.5;">
        {s['full_name']}<br/>
        {s['street']}, {s['number']} {s.get('complement','')}<br/>
        {s['neighborhood']} — {s['city']}/{s['state']}<br/>
        CEP {s['cep']} · {s['phone']}
      </p>
      <h3 style="font-size:14px;color:#71717a;text-transform:uppercase;letter-spacing:0.1em;margin-top:24px;">Pagamento</h3>
      <p style="margin:6px 0;color:#1c1c1e;">{payment_label}</p>
      <p style="margin:6px 0;color:#71717a;font-size:13px;">Status: <strong>{order['status'].replace('_',' ')}</strong></p>
    </td></tr>
    <tr><td style="background:#0F0F12;padding:20px 32px;color:#a1a1aa;font-size:12px;">
      AutoVisor Tecnologia LTDA · contato@autovisor.com.br · (11) 4002-8922<br/>
      Você recebeu este e-mail porque fez uma compra na nossa loja.
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>"""

async def _send_order_email(order: dict) -> None:
    """Send order confirmation email. Mocks (logs) if RESEND_API_KEY is missing."""
    api_key = os.environ.get("RESEND_API_KEY", "").strip()
    sender = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
    html = _build_order_email_html(order)
    subject = f"AutoVisor — Pedido {order['order_number']} confirmado"
    if not api_key:
        logger.info("[EMAIL MOCK] to=%s subject=%s (no RESEND_API_KEY set)", order["user_email"], subject)
        logger.info("[EMAIL MOCK] html_length=%d", len(html))
        return
    try:
        resend.api_key = api_key
        await asyncio.to_thread(resend.Emails.send, {
            "from": sender,
            "to": [order["user_email"]],
            "subject": subject,
            "html": html,
        })
        logger.info("[EMAIL SENT] to=%s order=%s", order["user_email"], order["order_number"])
    except Exception as e:
        logger.error("[EMAIL ERROR] %s", e)

@api_router.post("/orders")
async def create_order(payload: OrderCreateIn, user: dict = Depends(get_current_user)):
    if not payload.items:
        raise HTTPException(status_code=400, detail="Carrinho vazio")
    if payload.payment_method == "card" and not payload.card:
        raise HTTPException(status_code=400, detail="Dados do cartão obrigatórios")
    coupon = await _resolve_coupon(user["id"], payload.coupon_code)
    totals = _compute_total(payload.items, payload.payment_method, coupon)
    order_id = str(uuid.uuid4())
    order_number = f"AV-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{order_id[:6].upper()}"
    pix_code = None
    if payload.payment_method == "pix":
        pix_code = (
            f"00020126360014BR.GOV.BCB.PIX0114+5511999998888"
            f"52040000530398654{totals['total']/100:013.2f}5802BR5910AutoVisor"
            f"6009Sao Paulo62070503{order_id[:5]}6304ABCD"
        )
    card_last4 = payload.card.number[-4:] if payload.card else None
    doc = {
        "id": order_id,
        "order_number": order_number,
        "user_id": user["id"],
        "user_email": user["email"],
        "items": totals["items"],
        "products_total": totals["products_total"],
        "import_tax_total": totals["import_tax_total"],
        "subtotal": totals["subtotal"],
        "coupon_code": coupon["code"] if coupon else None,
        "coupon_discount": totals["coupon_discount"],
        "pix_discount": totals["pix_discount"],
        "discount": totals["discount"],
        "shipping": totals["shipping"],
        "total": totals["total"],
        "payment_method": payload.payment_method,
        "card_last4": card_last4,
        "card_installments": payload.card.installments if payload.card else None,
        "pix_code": pix_code,
        "shipping_data": payload.shipping.model_dump(),
        "status": "aguardando_pagamento" if payload.payment_method == "pix" else "pago",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.orders.insert_one(doc)
    doc.pop("_id", None)
    # Increment coupon uses
    if coupon:
        await db.coupons.update_one({"code": coupon["code"]}, {"$inc": {"uses": 1}})
    # Fire-and-forget email confirmation
    asyncio.create_task(_send_order_email(doc))
    return doc

@api_router.get("/orders")
async def my_orders(user: dict = Depends(get_current_user)):
    docs = await db.orders.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return docs

@api_router.get("/orders/{order_id}")
async def get_order(order_id: str, user: dict = Depends(get_current_user)):
    doc = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    if doc["user_id"] != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado")
    return doc

@api_router.get("/admin/orders")
async def admin_orders(_: dict = Depends(admin_required)):
    docs = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs

@api_router.get("/admin/stats")
async def admin_stats(_: dict = Depends(admin_required)):
    docs = await db.orders.find({}, {"_id": 0}).to_list(2000)
    revenue = sum(d.get("total", 0) for d in docs)
    return {
        "orders_count": len(docs),
        "revenue_cents": revenue,
        "users_count": await db.users.count_documents({}),
    }

# --- Misc ---
@api_router.get("/")
async def root():
    return {"message": "AutoVisor API", "ok": True}

app.include_router(api_router)

# Build CORS allow-list: FRONTEND_URL + CORS_ORIGINS env (comma-separated) + localhost.
_cors_env = os.environ.get("CORS_ORIGINS", "")
_extra_origins = [o.strip() for o in _cors_env.split(",") if o.strip() and o.strip() != "*"]
_allow_origins = list({
    *(o for o in [os.environ.get("FRONTEND_URL", "")] if o),
    *_extra_origins,
    "http://localhost:3000",
})
# Production domains baked in so they keep working even if env wasn't updated
for _o in ("https://hudhub.com.br", "https://www.hudhub.com.br"):
    if _o not in _allow_origins:
        _allow_origins.append(_o)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.orders.create_index("user_id")
    await db.coupons.create_index("code", unique=True)
    await db.events.create_index("created_at")
    await db.events.create_index("type")
    await _seed_default_coupons()
    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@autovisor.com.br")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@AutoVisor2026")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "full_name": "Administrador AutoVisor",
            "cpf": "000.000.000-00",
            "phone": "(11) 99999-9999",
            "cep": "01000-000",
            "address_street": "Av. Paulista",
            "address_number": "1000",
            "address_complement": "",
            "address_neighborhood": "Bela Vista",
            "address_city": "São Paulo",
            "address_state": "SP",
            "birth_date": "",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info("Admin user seeded: %s", admin_email)
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password), "role": "admin"}}
        )
        logger.info("Admin user password updated")

@app.on_event("shutdown")
async def shutdown():
    client.close()

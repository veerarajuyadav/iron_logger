from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ServerSelectionTimeoutError
import certifi
import os
import logging

# -------- DB ----------

class DatabaseUnavailable(RuntimeError):
    pass


class UnavailableCursor:
    def sort(self, *args, **kwargs):
        return self

    def limit(self, *args, **kwargs):
        return self

    def to_list(self, *args, **kwargs):
        raise DatabaseUnavailable("Database is unavailable")


class UnavailableCollection:
    def __getattr__(self, name: str):
        return self

    async def __call__(self, *args, **kwargs):
        raise DatabaseUnavailable("Database is unavailable")

    async def find_one(self, *args, **kwargs):
        raise DatabaseUnavailable("Database is unavailable")

    async def insert_one(self, *args, **kwargs):
        raise DatabaseUnavailable("Database is unavailable")

    async def update_one(self, *args, **kwargs):
        raise DatabaseUnavailable("Database is unavailable")

    async def delete_one(self, *args, **kwargs):
        raise DatabaseUnavailable("Database is unavailable")

    async def count_documents(self, *args, **kwargs):
        raise DatabaseUnavailable("Database is unavailable")

    def create_index(self, *args, **kwargs):
        raise DatabaseUnavailable("Database is unavailable")

    def find(self, *args, **kwargs):
        return UnavailableCursor()

    def aggregate(self, *args, **kwargs):
        return UnavailableCursor()


class UnavailableDB:
    def __bool__(self) -> bool:
        return False

    def __getattr__(self, name: str):
        return UnavailableCollection()


def get_mongo_url() -> str:
    mongo_url = os.environ.get('MONGO_URL', '').strip()
    if not mongo_url:
        return ''
    if '<db_password>' in mongo_url or 'password' in mongo_url and '<' in mongo_url:
        raise RuntimeError(
            'MONGO_URL contains placeholder credentials. Replace <db_password> with your Atlas password.'
        )
    return mongo_url


def _bool_env(name: str, default: bool = False) -> bool:
    value = os.environ.get(name, None)
    if value is None:
        return default
    return value.strip().lower() in ('1', 'true', 'yes', 'on')


client = None
db = UnavailableDB()


async def ensure_db():
    global client, db
    if client is not None and db is not None and not isinstance(db, UnavailableDB):
        try:
            await client.admin.command('ping')
            return db
        except Exception:
            try:
                client.close()
            except Exception:
                pass
            client = None
            db = UnavailableDB()

    mongo_url = get_mongo_url()
    if not mongo_url:
        raise DatabaseUnavailable('MONGO_URL is missing. Set MONGO_URL in backend/.env or your environment.')

    connection_kwargs = {
        'tls': True,
        'tlsCAFile': certifi.where(),
        'serverSelectionTimeoutMS': 10000,
        'connectTimeoutMS': 10000,
        'socketTimeoutMS': 20000,
    }
    if _bool_env('MONGO_TLS_ALLOW_INVALID_CERTS'):
        connection_kwargs['tlsAllowInvalidCertificates'] = True
    if _bool_env('MONGO_TLS_ALLOW_INVALID_HOSTNAMES'):
        connection_kwargs['tlsAllowInvalidHostnames'] = True
    if _bool_env('MONGO_TLS_INSECURE'):
        connection_kwargs['tlsInsecure'] = True

    async def _connect_with_kwargs(url: str, kwargs: dict):
        global client, db
        if client is not None:
            try:
                client.close()
            except Exception:
                pass
        client = AsyncIOMotorClient(url, **kwargs)
        db = client[os.environ.get('DB_NAME', 'test_database')]
        await client.admin.command('ping')
        return db

    try:
        return await _connect_with_kwargs(mongo_url, connection_kwargs)
    except ServerSelectionTimeoutError as exc:
        if 'SSL handshake failed' in str(exc):
            if not connection_kwargs.get('tlsAllowInvalidCertificates') and not connection_kwargs.get('tlsInsecure'):
                logger.warning('MongoDB SSL handshake failed, retrying with invalid certificate/hostname allowances.')
                connection_kwargs['tlsAllowInvalidCertificates'] = True
                connection_kwargs['tlsAllowInvalidHostnames'] = True
                try:
                    return await _connect_with_kwargs(mongo_url, connection_kwargs)
                except Exception as exc2:
                    try:
                        client.close()
                    except Exception:
                        pass
                    client = None
                    db = UnavailableDB()
                    raise DatabaseUnavailable(f'Database connection failed: {exc2}') from exc2
            if not connection_kwargs.get('tlsInsecure'):
                logger.warning('MongoDB SSL handshake failed, retrying with tlsInsecure enabled.')
                insecure_kwargs = {k: v for k, v in connection_kwargs.items() if k not in ('tlsAllowInvalidCertificates', 'tlsAllowInvalidHostnames')}
                insecure_kwargs['tlsInsecure'] = True
                try:
                    return await _connect_with_kwargs(mongo_url, insecure_kwargs)
                except Exception as exc2:
                    try:
                        client.close()
                    except Exception:
                        pass
                    client = None
                    db = UnavailableDB()
                    raise DatabaseUnavailable(f'Database connection failed: {exc2}') from exc2
        try:
            client.close()
        except Exception:
            pass
        client = None
        db = UnavailableDB()
        raise DatabaseUnavailable(f'Database connection failed: {exc}') from exc
    except Exception as exc:
        try:
            client.close()
        except Exception:
            pass
        client = None
        db = UnavailableDB()
        raise DatabaseUnavailable(f'Database connection failed: {exc}') from exc


import bcrypt
import jwt
import uuid
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Literal
from datetime import datetime, timezone, timedelta, date

# -------- App ---------
app = FastAPI()
api = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"


def get_jwt_secret() -> str:
    return os.environ.get("JWT_SECRET", "dev-secret-change-me")


# ---------- Helpers ----------
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def set_auth_cookie(response: Response, token: str) -> None:
    # determine secure flag: use explicit COOKIE_SECURE env, or enable in Vercel/HTTPS
    cookie_secure_env = os.environ.get("COOKIE_SECURE", "").lower()
    if cookie_secure_env in ("1", "true", "yes"):
        secure_flag = True
    elif cookie_secure_env in ("0", "false", "no"):
        secure_flag = False
    else:
        # enable secure cookies when running on Vercel or when FRONTEND_URL is https
        secure_flag = bool(os.environ.get("VERCEL", "")) or os.environ.get("FRONTEND_URL", "").startswith("https")

    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=secure_flag,
        samesite="lax",
        max_age=60 * 60 * 24 * 7,
        path="/",
    )


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        await ensure_db()
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        user_id = payload["sub"]
        user = await db.users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user.pop("_id", None)
        user.pop("password_hash", None)
        return user
    except DatabaseUnavailable as exc:
        # surface DB unavailable as 503; include detail when DEBUG set for troubleshooting
        detail_msg = str(exc)
        if os.environ.get("DEBUG", "0") != "1":
            detail_msg = "Database unavailable"
        raise HTTPException(status_code=503, detail=detail_msg) from exc
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ---------- Models ----------
class RegisterReq(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str


class LoginReq(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    units: str = "kg"
    created_at: str


class UnitsUpdate(BaseModel):
    units: Literal["kg", "lbs"]


class Exercise(BaseModel):
    id: Optional[str] = None
    name: str
    muscle_group: str  # chest, back, legs, shoulders, arms, core, cardio, other


class WorkoutSet(BaseModel):
    reps: int
    weight: float
    rpe: Optional[float] = None


class WorkoutExercise(BaseModel):
    exercise_id: str
    exercise_name: str
    muscle_group: str
    sets: List[WorkoutSet] = []
    notes: Optional[str] = None


class WorkoutIn(BaseModel):
    title: str
    date: str  # YYYY-MM-DD
    status: Literal["scheduled", "completed"] = "scheduled"
    notes: Optional[str] = None
    exercises: List[WorkoutExercise] = []


class WorkoutUpdate(BaseModel):
    title: Optional[str] = None
    date: Optional[str] = None
    status: Optional[Literal["scheduled", "completed"]] = None
    notes: Optional[str] = None
    exercises: Optional[List[WorkoutExercise]] = None


class BodyWeightIn(BaseModel):
    date: str  # YYYY-MM-DD
    weight: float


# ---------- Health ----------
@app.get("/healthz")
async def healthz():
    try:
        await ensure_db()
        return {"status": "ok", "database": "ready"}
    except DatabaseUnavailable:
        return Response(content='{"status":"ok","database":"unavailable"}', status_code=503, media_type='application/json')


@app.exception_handler(DatabaseUnavailable)
async def database_unavailable_handler(request: Request, exc: DatabaseUnavailable):
    return Response(content='{"detail":"Database unavailable"}', status_code=503, media_type='application/json')


# ---------- Auth Routes ----------
@api.post("/auth/register")
async def register(req: RegisterReq, response: Response):
    try:
        await ensure_db()
        email = req.email.lower()
        existing = await db.users.find_one({"email": email})
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        user_id = str(uuid.uuid4())
        doc = {
            "id": user_id,
            "email": email,
            "name": req.name,
            "password_hash": hash_password(req.password),
            "units": "kg",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(doc)
        token = create_access_token(user_id, email)
        set_auth_cookie(response, token)
        return {"id": user_id, "email": email, "name": req.name, "units": "kg", "created_at": doc["created_at"], "token": token}
    except DatabaseUnavailable as exc:
        detail_msg = str(exc)
        if os.environ.get("DEBUG", "0") != "1":
            detail_msg = "Database unavailable"
        raise HTTPException(status_code=503, detail=detail_msg) from exc
    except Exception as exc:
        logger.exception("Registration failed")
        detail_msg = "Registration failed"
        if os.environ.get("DEBUG", "0") == "1":
            detail_msg = f"Registration failed: {exc}"
        raise HTTPException(status_code=500, detail=detail_msg) from exc


@api.post("/auth/login")
async def login(req: LoginReq, response: Response):
    try:
        await ensure_db()
        email = req.email.lower()
        user = await db.users.find_one({"email": email})
        if not user or not verify_password(req.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        token = create_access_token(user["id"], email)
        set_auth_cookie(response, token)
        return {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "units": user.get("units", "kg"),
            "created_at": user["created_at"],
            "token": token,
        }
    except DatabaseUnavailable as exc:
        detail_msg = str(exc)
        if os.environ.get("DEBUG", "0") != "1":
            detail_msg = "Database unavailable"
        raise HTTPException(status_code=503, detail=detail_msg) from exc
    except Exception as exc:
        logger.exception("Login failed")
        detail_msg = "Login failed"
        if os.environ.get("DEBUG", "0") == "1":
            detail_msg = f"Login failed: {exc}"
        raise HTTPException(status_code=500, detail=detail_msg) from exc


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@api.patch("/auth/units")
async def update_units(body: UnitsUpdate, user: dict = Depends(get_current_user)):
    await db.users.update_one({"id": user["id"]}, {"$set": {"units": body.units}})
    return {"units": body.units}


# ---------- Exercises ----------
@api.get("/exercises")
async def list_exercises(user: dict = Depends(get_current_user)):
    docs = await db.exercises.find({"user_id": user["id"]}, {"_id": 0}).to_list(1000)
    return docs


@api.post("/exercises")
async def create_exercise(body: Exercise, user: dict = Depends(get_current_user)):
    eid = str(uuid.uuid4())
    doc = {
        "id": eid,
        "user_id": user["id"],
        "name": body.name,
        "muscle_group": body.muscle_group,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.exercises.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.delete("/exercises/{exercise_id}")
async def delete_exercise(exercise_id: str, user: dict = Depends(get_current_user)):
    res = await db.exercises.delete_one({"id": exercise_id, "user_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}


# ---------- Workouts ----------
@api.get("/workouts")
async def list_workouts(
    user: dict = Depends(get_current_user),
    start: Optional[str] = None,
    end: Optional[str] = None,
    status: Optional[str] = None,
):
    q: dict = {"user_id": user["id"]}
    if start or end:
        q["date"] = {}
        if start:
            q["date"]["$gte"] = start
        if end:
            q["date"]["$lte"] = end
    if status:
        q["status"] = status
    docs = await db.workouts.find(q, {"_id": 0}).sort("date", -1).to_list(2000)
    return docs


@api.post("/workouts")
async def create_workout(body: WorkoutIn, user: dict = Depends(get_current_user)):
    wid = str(uuid.uuid4())
    doc = {
        "id": wid,
        "user_id": user["id"],
        "title": body.title,
        "date": body.date,
        "status": body.status,
        "notes": body.notes,
        "exercises": [e.model_dump() for e in body.exercises],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.workouts.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/workouts/{wid}")
async def get_workout(wid: str, user: dict = Depends(get_current_user)):
    doc = await db.workouts.find_one({"id": wid, "user_id": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Not found")
    return doc


@api.patch("/workouts/{wid}")
async def update_workout(wid: str, body: WorkoutUpdate, user: dict = Depends(get_current_user)):
    update = {k: v for k, v in body.model_dump(exclude_unset=True).items()}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    res = await db.workouts.update_one({"id": wid, "user_id": user["id"]}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    doc = await db.workouts.find_one({"id": wid, "user_id": user["id"]}, {"_id": 0})
    return doc


@api.delete("/workouts/{wid}")
async def delete_workout(wid: str, user: dict = Depends(get_current_user)):
    res = await db.workouts.delete_one({"id": wid, "user_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}


# ---------- Body Weight ----------
@api.get("/body-weight")
async def list_body_weight(user: dict = Depends(get_current_user)):
    docs = await db.body_weights.find({"user_id": user["id"]}, {"_id": 0}).sort("date", -1).to_list(2000)
    return docs


@api.post("/body-weight")
async def add_body_weight(body: BodyWeightIn, user: dict = Depends(get_current_user)):
    # upsert per date
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "date": body.date,
        "weight": body.weight,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.body_weights.update_one(
        {"user_id": user["id"], "date": body.date},
        {"$set": {"weight": body.weight, "created_at": doc["created_at"]}, "$setOnInsert": {"id": doc["id"]}},
        upsert=True,
    )
    saved = await db.body_weights.find_one({"user_id": user["id"], "date": body.date}, {"_id": 0})
    return saved


@api.delete("/body-weight/{bid}")
async def delete_body_weight(bid: str, user: dict = Depends(get_current_user)):
    res = await db.body_weights.delete_one({"id": bid, "user_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}


# ---------- Stats / Analytics ----------
def _estimated_1rm(weight: float, reps: int) -> float:
    if reps <= 0:
        return 0.0
    # Epley formula
    return round(weight * (1 + reps / 30.0), 2)


@api.get("/stats/dashboard")
async def stats_dashboard(user: dict = Depends(get_current_user)):
    today_str = date.today().isoformat()
    # Latest body weight
    bw = await db.body_weights.find({"user_id": user["id"]}, {"_id": 0}).sort("date", -1).limit(1).to_list(1)
    latest_weight = bw[0] if bw else None
    # Today's workout (scheduled or completed)
    today_workouts = await db.workouts.find({"user_id": user["id"], "date": today_str}, {"_id": 0}).to_list(50)
    # Recent completed (last 5)
    recent = (
        await db.workouts.find({"user_id": user["id"], "status": "completed"}, {"_id": 0})
        .sort("date", -1)
        .limit(5)
        .to_list(5)
    )
    # Upcoming scheduled (after today)
    upcoming = (
        await db.workouts.find({"user_id": user["id"], "status": "scheduled", "date": {"$gt": today_str}}, {"_id": 0})
        .sort("date", 1)
        .limit(5)
        .to_list(5)
    )
    # PRs: best 1RM per exercise across completed workouts
    pipeline = [
        {"$match": {"user_id": user["id"], "status": "completed"}},
        {"$unwind": "$exercises"},
        {"$unwind": "$exercises.sets"},
    ]
    completed = await db.workouts.aggregate(pipeline).to_list(20000)
    pr_map: dict = {}
    for row in completed:
        ex = row["exercises"]
        st = ex["sets"]
        reps = int(st.get("reps", 0))
        weight = float(st.get("weight", 0))
        if reps == 0 or weight == 0:
            continue
        one_rm = _estimated_1rm(weight, reps)
        key = ex["exercise_name"]
        if key not in pr_map or one_rm > pr_map[key]["one_rm"]:
            pr_map[key] = {
                "exercise_name": key,
                "muscle_group": ex.get("muscle_group", "other"),
                "one_rm": one_rm,
                "weight": weight,
                "reps": reps,
                "date": row["date"],
            }
    prs = sorted(pr_map.values(), key=lambda x: x["one_rm"], reverse=True)[:6]
    # Total completed
    total_completed = await db.workouts.count_documents({"user_id": user["id"], "status": "completed"})

    return {
        "latest_weight": latest_weight,
        "today_workouts": today_workouts,
        "recent_workouts": recent,
        "upcoming_workouts": upcoming,
        "personal_records": prs,
        "total_completed": total_completed,
    }


@api.get("/stats/streak")
async def stats_streak(user: dict = Depends(get_current_user)):
    docs = await db.workouts.find(
        {"user_id": user["id"], "status": "completed"}, {"_id": 0, "date": 1}
    ).to_list(5000)
    if not docs:
        return {"current_streak": 0, "longest_streak": 0, "weekly_counts": []}
    dates = sorted({d["date"] for d in docs})
    date_set = set(dates)
    # current streak: count consecutive days back from today
    current = 0
    cur = date.today()
    while cur.isoformat() in date_set:
        current += 1
        cur = cur - timedelta(days=1)
    # longest streak across all dates
    longest = 0
    run = 0
    prev = None
    for d_str in dates:
        d_obj = date.fromisoformat(d_str)
        if prev is not None and (d_obj - prev).days == 1:
            run += 1
        else:
            run = 1
        longest = max(longest, run)
        prev = d_obj
    # last 12 weeks counts
    today = date.today()
    weekly = []
    for w in range(11, -1, -1):
        end_dt = today - timedelta(days=w * 7)
        start_dt = end_dt - timedelta(days=6)
        cnt = sum(1 for d_str in dates if start_dt.isoformat() <= d_str <= end_dt.isoformat())
        weekly.append({"week_start": start_dt.isoformat(), "week_end": end_dt.isoformat(), "count": cnt})
    return {"current_streak": current, "longest_streak": longest, "weekly_counts": weekly}


@api.get("/stats/muscle-groups")
async def stats_muscle_groups(user: dict = Depends(get_current_user)):
    pipeline = [
        {"$match": {"user_id": user["id"], "status": "completed"}},
        {"$unwind": "$exercises"},
        {"$group": {"_id": "$exercises.muscle_group", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    rows = await db.workouts.aggregate(pipeline).to_list(100)
    return [{"muscle_group": r["_id"] or "other", "count": r["count"]} for r in rows]


@api.get("/stats/strength-progression")
async def stats_strength_progression(exercise_name: str, user: dict = Depends(get_current_user)):
    pipeline = [
        {"$match": {"user_id": user["id"], "status": "completed"}},
        {"$unwind": "$exercises"},
        {"$match": {"exercises.exercise_name": exercise_name}},
        {"$unwind": "$exercises.sets"},
        {"$project": {"date": 1, "reps": "$exercises.sets.reps", "weight": "$exercises.sets.weight"}},
        {"$sort": {"date": 1}},
    ]
    rows = await db.workouts.aggregate(pipeline).to_list(20000)
    # best 1RM per date
    by_date: dict = {}
    for r in rows:
        one_rm = _estimated_1rm(float(r.get("weight", 0) or 0), int(r.get("reps", 0) or 0))
        d_str = r["date"]
        if d_str not in by_date or one_rm > by_date[d_str]:
            by_date[d_str] = one_rm
    series = [{"date": k, "one_rm": v} for k, v in sorted(by_date.items())]
    return {"exercise_name": exercise_name, "series": series}


# Mount router
app.include_router(api)
# also accept requests forwarded with the monorepo route prefix
app.include_router(api, prefix="/_/backend/api")

# CORS
frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
raw_cors_origins = os.environ.get("CORS_ORIGINS", "").strip()
allowed_origins = {frontend_url, "http://localhost:3000"}
parsed_origins = [origin.strip() for origin in raw_cors_origins.split(",") if origin.strip()]
for origin in parsed_origins:
    if origin == "*":
        continue
    allowed_origins.add(origin)

allowed_origins = list(allowed_origins)
allow_credentials = True
if not allowed_origins:
    allowed_origins = ["*"]
    allow_credentials = False

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def on_startup():
    try:
        await ensure_db()
        await db.users.create_index("email", unique=True)
        await db.workouts.create_index([("user_id", 1), ("date", -1)])
        await db.body_weights.create_index([("user_id", 1), ("date", -1)], unique=True)
        await db.exercises.create_index([("user_id", 1), ("name", 1)])

        # seed admin
        admin_email = os.environ.get("ADMIN_EMAIL", "admin@gymtracker.com").lower()
        admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
        existing = await db.users.find_one({"email": admin_email})
        if not existing:
            await db.users.insert_one(
                {
                    "id": str(uuid.uuid4()),
                    "email": admin_email,
                    "name": "Admin",
                    "password_hash": hash_password(admin_password),
                    "units": "kg",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }
            )
        elif not verify_password(admin_password, existing["password_hash"]):
            await db.users.update_one(
                {"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}}
            )
    except DatabaseUnavailable as exc:
        logger.warning("Database unavailable during startup: %s", exc)
    except Exception as exc:
        logger.exception("Unexpected startup error: %s", exc)


@app.on_event("shutdown")
async def shutdown_db_client():
    if client is not None:
        client.close()

if __name__ == "__main__":
    import uvicorn
    # Allows running the server via 'python server.py'
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)

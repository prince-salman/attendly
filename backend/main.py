"""
Attendly – Python Face Recognition Backend
==========================================
Passive walk-by face recognition powered by InsightFace (SCRFD + MobileFaceNet ArcFace).
Detects angled, side-profile, tilted heads so students don't need to face the camera directly.

Endpoints:
  WS   /ws/detect           – Real-time video frame streaming → JSON detection results
  POST /enroll              – Multipart form-data student enrollment
  POST /enroll-base64       – JSON base64 student enrollment (direct from web canvas)
  GET  /students            – List all enrolled students with embedding counts
  DELETE /students/{id}     – Remove a student from database
  GET  /health              – Backend health and model status
"""

from __future__ import annotations

import asyncio
import base64
import json
import logging
import os
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

import cv2
import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ──────────────────────────────────────────────────────────
# Logging
# ──────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger("attendly-backend")

# ──────────────────────────────────────────────────────────
# Paths & Database
# ──────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).parent.resolve()
DB_PATH = BASE_DIR / "students_db.json"
MODELS_DIR = BASE_DIR / "models"
MODELS_DIR.mkdir(exist_ok=True)

def _load_db() -> dict[str, Any]:
    if DB_PATH.exists():
        try:
            with open(DB_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            log.warning("Could not read students_db.json, starting fresh: %s", e)
    return {}

def _save_db(db: dict[str, Any]) -> None:
    try:
        with open(DB_PATH, "w", encoding="utf-8") as f:
            json.dump(db, f, ensure_ascii=False, indent=2)
    except Exception as e:
        log.error("Failed to save students_db.json: %s", e)

# In-memory store: { student_id: {"meta": {...}, "embeddings": [[512-dim], ...]} }
students: dict[str, Any] = _load_db()

# ──────────────────────────────────────────────────────────
# Supabase Cloud Synchronization
# ──────────────────────────────────────────────────────────
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://fruurxbfolykyylzktns.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "sb_publishable_Fl4iW8EVOWjzyhjhXcKZxA_Nm1gJFcS")

def _sync_from_supabase() -> None:
    """Fetch all students and their biometric descriptors directly from Supabase Cloud."""
    try:
        import urllib.request
        req = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/students?select=*",
            headers={
                "apikey": SUPABASE_KEY,
                "Content-Type": "application/json"
            }
        )
        with urllib.request.urlopen(req, timeout=6) as resp:
            data = json.loads(resp.read().decode())
            log.info("Successfully fetched %d students directly from Supabase Cloud", len(data))
            for row in data:
                sid = row.get("id")
                if not sid:
                    continue
                call_name = row.get("nickname") or (row.get("name", "").split()[0] if row.get("name") else "Siswa")
                descriptors = row.get("face_descriptors") or []
                if sid not in students:
                    students[sid] = {
                        "meta": {
                            "id": sid,
                            "name": row.get("name", "Siswa"),
                            "nickname": call_name,
                            "class": row.get("class", "10-IPA-1"),
                            "gender": row.get("gender", "L"),
                            "parentName": row.get("parent_name", ""),
                            "parentPhone": row.get("parent_phone", ""),
                            "enrolledAt": row.get("created_at") or time.strftime("%Y-%m-%d %H:%M:%S"),
                        },
                        "embeddings": descriptors if isinstance(descriptors, list) else [],
                    }
                else:
                    students[sid]["meta"]["name"] = row.get("name", students[sid]["meta"].get("name"))
                    students[sid]["meta"]["class"] = row.get("class", students[sid]["meta"].get("class"))
                    students[sid]["meta"]["parentName"] = row.get("parent_name", students[sid]["meta"].get("parentName"))
                    students[sid]["meta"]["parentPhone"] = row.get("parent_phone", students[sid]["meta"].get("parentPhone"))
                    if descriptors and len(descriptors) > 0:
                        students[sid]["embeddings"] = descriptors
            _save_db(students)
    except Exception as e:
        log.warning("Supabase cloud fetch warning (continuing with local edge cache): %s", e)

def _save_student_to_supabase(student_meta: dict, embeddings: list[list[float]]) -> None:
    """Push student metadata and ArcFace vectors directly to Supabase."""
    try:
        import urllib.request
        payload = {
            "id": student_meta.get("id"),
            "name": student_meta.get("name"),
            "class": student_meta.get("class", "10-IPA-1"),
            "gender": student_meta.get("gender", "L"),
            "parent_name": student_meta.get("parentName", ""),
            "parent_phone": student_meta.get("parentPhone", ""),
            "face_descriptors": embeddings,
            "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
        req = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/students",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "apikey": SUPABASE_KEY,
                "Content-Type": "application/json",
                "Prefer": "resolution=merge-duplicates"
            },
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=6) as resp:
            log.info("Student %s synced to Supabase Cloud (HTTP %d)", student_meta.get("id"), resp.status)
    except Exception as e:
        log.warning("Failed to sync student to Supabase Cloud: %s", e)

def _delete_student_from_supabase(student_id: str) -> None:
    """Delete student from Supabase Cloud."""
    try:
        import urllib.request
        req = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/students?id=eq.{student_id}",
            headers={
                "apikey": SUPABASE_KEY,
                "Content-Type": "application/json"
            },
            method="DELETE"
        )
        with urllib.request.urlopen(req, timeout=6) as resp:
            log.info("Student %s deleted from Supabase Cloud (HTTP %d)", student_id, resp.status)
    except Exception as e:
        log.warning("Failed to delete student from Supabase Cloud: %s", e)

# ──────────────────────────────────────────────────────────
# InsightFace Model (buffalo_sc: SCRFD + MobileFaceNet ArcFace)
# ──────────────────────────────────────────────────────────
_face_app = None
_model_lock = asyncio.Lock()

async def get_face_app():
    """Lazy-load InsightFace buffalo_sc model (already cached locally)."""
    global _face_app
    if _face_app is not None:
        return _face_app

    async with _model_lock:
        if _face_app is not None:
            return _face_app

        log.info("Initializing InsightFace buffalo_sc model from %s…", MODELS_DIR)
        try:
            import insightface
            from insightface.app import FaceAnalysis

            app = FaceAnalysis(
                name="buffalo_sc",
                root=str(MODELS_DIR),
                providers=["CPUExecutionProvider"],
            )
            # det_size 800 and det_thresh 0.08 enable ultra-sensitive long-range (3-8m) and omni-angle detection
            app.prepare(ctx_id=0, det_thresh=0.08, det_size=(800, 800))
            _face_app = app
            log.info("InsightFace omni-angle & long-range model initialized (SCRFD det_thresh=0.08, det_size=800 + ArcFace)")
        except Exception as exc:
            log.error("Failed to load InsightFace: %s", exc)
            raise RuntimeError(f"InsightFace load error: {exc}") from exc

    return _face_app

# ──────────────────────────────────────────────────────────
# Math & Vector Utilities
# ──────────────────────────────────────────────────────────

def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Cosine similarity between two 512-dim normalized vectors."""
    a_norm = a / (np.linalg.norm(a) + 1e-10)
    b_norm = b / (np.linalg.norm(b) + 1e-10)
    return float(np.dot(a_norm, b_norm))

def _compute_omni_face_topology(face, w_img: int, h_img: int) -> tuple[dict[str, Any], dict[str, list[float]], dict[str, Any]]:
    """
    Computes 3D head pose and full-face topological landmarks across all parts of the face:
    - Atas (Forehead / Dahi)
    - Bawah (Chin / Dagu & Rahang)
    - Samping Kiri (Left Profile / Pipi & Pelipis Kiri)
    - Samping Kanan (Right Profile / Pipi & Pelipis Kanan)
    - Tengah (Mata, Pangkal & Ujung Hidung, Mulut)
    """
    if not hasattr(face, "kps") or face.kps is None or len(face.kps) < 5:
        default_pose = {
            "yaw": 0.0,
            "pitch": 0.0,
            "roll": 0.0,
            "pose_label": "Frontal (Tampak Depan)",
            "is_angled": False,
            "angle_tag": "FRONT",
            "active_part": "front",
        }
        default_cov = {
            "top": True,
            "bottom": True,
            "left": True,
            "right": True,
            "coverage_pct": 100,
            "summary": "Seluruh Wajah Terdeteksi",
        }
        return default_pose, {}, default_cov

    kps = face.kps
    le = kps[0]  # Left eye
    re = kps[1]  # Right eye
    nose = kps[2]  # Nose tip
    lm = kps[3]  # Left mouth
    rm = kps[4]  # Right mouth

    eye_mid = (le + re) / 2.0
    mouth_mid = (lm + rm) / 2.0
    face_v = mouth_mid - eye_mid
    eye_dx = re[0] - le[0]

    # 1. Yaw: Horizontal asymmetry between nose and both eyes
    dist_l = abs(nose[0] - le[0])
    dist_r = abs(re[0] - nose[0])
    asymmetry = (dist_l - dist_r) / (dist_l + dist_r + 1e-5)
    approx_yaw = float(asymmetry * 75.0)

    # 2. Pitch: Vertical ratio between eyes, nose, and mouth
    face_v_span = max(1.0, float(mouth_mid[1] - eye_mid[1]))
    nose_rel_v = (nose[1] - eye_mid[1]) / face_v_span
    approx_pitch = float((nose_rel_v - 0.50) * 80.0)

    # 3. Roll: Head tilt
    approx_roll = float(np.degrees(np.arctan2(re[1] - le[1], re[0] - le[0] + 1e-5)))

    # Topological Landmarks for ALL Face Parts:
    # A. Bagian Atas (Forehead / Dahi)
    forehead_mid = eye_mid - face_v * 0.75
    forehead_l = np.array([le[0] - eye_dx * 0.35, forehead_mid[1]])
    forehead_r = np.array([re[0] + eye_dx * 0.35, forehead_mid[1]])

    # B. Bagian Bawah (Chin & Jawline / Dagu & Rahang)
    chin = mouth_mid + face_v * 0.75
    jaw_l = np.array([lm[0] - eye_dx * 0.55, mouth_mid[1] + face_v[1] * 0.3])
    jaw_r = np.array([rm[0] + eye_dx * 0.55, mouth_mid[1] + face_v[1] * 0.3])

    # C. Bagian Samping Kiri & Kanan (Cheeks & Temples / Pipi Samping)
    cheek_l = np.array([le[0] - eye_dx * 0.65, eye_mid[1] + face_v[1] * 0.25])
    cheek_r = np.array([re[0] + eye_dx * 0.65, eye_mid[1] + face_v[1] * 0.25])

    def to_pct(pt):
        px = round(max(0.0, min(100.0, (float(pt[0]) / max(1, w_img)) * 100.0)), 2)
        py = round(max(0.0, min(100.0, (float(pt[1]) / max(1, h_img)) * 100.0)), 2)
        return [px, py]

    landmarks = {
        "forehead": to_pct(forehead_mid),
        "forehead_l": to_pct(forehead_l),
        "forehead_r": to_pct(forehead_r),
        "left_eye": to_pct(le),
        "right_eye": to_pct(re),
        "nose": to_pct(nose),
        "left_mouth": to_pct(lm),
        "right_mouth": to_pct(rm),
        "chin": to_pct(chin),
        "jaw_l": to_pct(jaw_l),
        "jaw_r": to_pct(jaw_r),
        "cheek_l": to_pct(cheek_l),
        "cheek_r": to_pct(cheek_r),
    }

    # Coverage verification across all 4 quadrants (Atas, Bawah, Kiri, Kanan)
    top_ok = bool(forehead_mid[1] >= -5 and forehead_mid[1] <= h_img)
    bot_ok = bool(chin[1] >= 0 and chin[1] <= h_img + 30)
    left_ok = bool(cheek_l[0] >= -5 and cheek_l[0] <= w_img)
    right_ok = bool(cheek_r[0] >= 0 and cheek_r[0] <= w_img + 5)
    cov_count = sum([top_ok, bot_ok, left_ok, right_ok])

    coverage = {
        "top": top_ok,
        "bottom": bot_ok,
        "left": left_ok,
        "right": right_ok,
        "coverage_pct": int((cov_count / 4.0) * 100),
        "summary": "Seluruh Wajah Terdeteksi (Atas • Bawah • Samping)",
    }

    is_side_left = approx_yaw < -18.0
    is_side_right = approx_yaw > 18.0
    is_looking_down = approx_pitch > 12.0
    is_looking_up = approx_pitch < -12.0

    tags = []
    active_part = "front"
    if is_side_left:
        tags.append("Samping Kiri (Profile)")
        active_part = "left"
    elif is_side_right:
        tags.append("Samping Kanan (Profile)")
        active_part = "right"

    if is_looking_down:
        tags.append("Atas / Dahi (Pitch Down)")
        if active_part == "front":
            active_part = "top"
    elif is_looking_up:
        tags.append("Bawah / Dagu (Pitch Up)")
        if active_part == "front":
            active_part = "bottom"

    if not tags:
        pose_label = "Frontal (Tampak Depan)"
        angle_tag = "FRONT"
        is_angled = False
    else:
        pose_label = " • ".join(tags)
        angle_tag = "ANGLED"
        is_angled = True

    pose = {
        "yaw": round(approx_yaw, 1),
        "pitch": round(approx_pitch, 1),
        "roll": round(approx_roll, 1),
        "pose_label": pose_label,
        "is_angled": is_angled,
        "angle_tag": angle_tag,
        "active_part": active_part,
    }

    return pose, landmarks, coverage

def _match_against_students(
    embedding: np.ndarray,
    is_angled: bool = False,
    threshold: float = 0.44,
    angled_threshold: float = 0.38,
) -> tuple[str | None, str | None, str | None, str | None, float]:
    """
    Match an ArcFace 512-dim vector against all enrolled students.
    Adaptive threshold: uses angled_threshold (0.38) when face is detected at side profile,
    overhead camera (pitch down), or lower angle (pitch up) to guarantee walk-by recognition.
    Strict threshold (0.44) prevents false identification of arbitrary faces to valen.
    """
    best_id: str | None = None
    best_name: str | None = None
    best_nickname: str | None = None
    best_class: str | None = None
    best_sim: float = -1.0

    effective_thresh = angled_threshold if is_angled else threshold

    for sid, data in students.items():
        ref_embeddings: list[list[float]] = data.get("embeddings", [])
        for ref in ref_embeddings:
            ref_np = np.array(ref, dtype=np.float32)
            sim = _cosine_similarity(embedding, ref_np)
            if sim > best_sim:
                best_sim = sim
                best_id = sid
                best_name = data["meta"].get("name")
                best_nickname = data["meta"].get("nickname") or best_name
                best_class = data["meta"].get("class")

    if best_sim >= effective_thresh:
        return best_id, best_name, best_nickname, best_class, best_sim
    return None, None, None, None, best_sim

def _extract_omni_angle_embeddings(face_app, bgr: np.ndarray) -> tuple[list[list[float]], float]:
    """
    Extracts comprehensive multi-angle biometric vectors from a student photo:
    1. Canonical Frontal Vector
    2. Horizontally Mirrored Vector (Left & Right Profile Walk-By)
    3. Elevated / Pitch-Down Perspective Vector (Overhead gate camera)
    4. Low-Angle / Pitch-Up Perspective Vector (Looking up / chin up)
    5. Natural Walking Tilt Vector (+/- 8° roll)
    """
    embeddings: list[list[float]] = []
    faces = face_app.get(bgr)
    if not faces:
        return [], 0.0

    face = max(faces, key=lambda f: float(f.det_score) * (f.bbox[2] - f.bbox[0]))
    best_score = float(face.det_score)
    embeddings.append(face.embedding.astype(np.float32).tolist())

    h, w = bgr.shape[:2]

    # 1. Mirrored Profile (Flip horizontally)
    try:
        flipped = cv2.flip(bgr, 1)
        faces_flip = face_app.get(flipped)
        if faces_flip:
            f_flip = max(faces_flip, key=lambda f: float(f.det_score))
            embeddings.append(f_flip.embedding.astype(np.float32).tolist())
    except Exception as e:
        log.warning("Augment flip error: %s", e)

    # 2. Elevated / Top-Down Perspective (overhead corridor view)
    try:
        src_pts = np.float32([[0, 0], [w, 0], [0, h], [w, h]])
        dst_top = np.float32([[0, 0], [w, 0], [int(w * 0.08), h], [int(w * 0.92), h]])
        M_top = cv2.getPerspectiveTransform(src_pts, dst_top)
        top_bgr = cv2.warpPerspective(bgr, M_top, (w, h), borderMode=cv2.BORDER_REFLECT)
        faces_top = face_app.get(top_bgr)
        if faces_top:
            f_top = max(faces_top, key=lambda f: float(f.det_score))
            embeddings.append(f_top.embedding.astype(np.float32).tolist())
    except Exception as e:
        log.warning("Augment top error: %s", e)

    # 3. Bottom / Low-Angle Perspective (chin up view)
    try:
        dst_bot = np.float32([[int(w * 0.08), 0], [int(w * 0.92), 0], [0, h], [w, h]])
        M_bot = cv2.getPerspectiveTransform(src_pts, dst_bot)
        bot_bgr = cv2.warpPerspective(bgr, M_bot, (w, h), borderMode=cv2.BORDER_REFLECT)
        faces_bot = face_app.get(bot_bgr)
        if faces_bot:
            f_bot = max(faces_bot, key=lambda f: float(f.det_score))
            embeddings.append(f_bot.embedding.astype(np.float32).tolist())
    except Exception as e:
        log.warning("Augment bottom error: %s", e)

    # 4. Walking Head Tilt (+/- 7° roll)
    try:
        M_tilt = cv2.getRotationMatrix2D((w / 2.0, h / 2.0), 7.0, 1.0)
        tilt_bgr = cv2.warpAffine(bgr, M_tilt, (w, h), borderMode=cv2.BORDER_REFLECT)
        faces_tilt = face_app.get(tilt_bgr)
        if faces_tilt:
            f_tilt = max(faces_tilt, key=lambda f: float(f.det_score))
            embeddings.append(f_tilt.embedding.astype(np.float32).tolist())
    except Exception as e:
        log.warning("Augment tilt error: %s", e)

    return embeddings, best_score

def _decode_image_bytes(data: bytes) -> np.ndarray:
    """Decode raw JPEG/PNG or Base64 bytes into BGR cv2 image."""
    if data.startswith(b"data:image"):
        comma = data.find(b",")
        if comma != -1:
            data = base64.b64decode(data[comma + 1:])
    arr = np.frombuffer(data, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Failed to decode image from buffer")
    return img

def _decode_base64_str(b64_str: str) -> np.ndarray:
    """Decode base64 data URL string into BGR image."""
    if "," in b64_str:
        b64_str = b64_str.split(",", 1)[1]
    raw = base64.b64decode(b64_str)
    return _decode_image_bytes(raw)

# ──────────────────────────────────────────────────────────
# App Lifecycle & Configuration
# ──────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Attendly Python Recognition Engine starting...")
    # Cloud sync with Supabase on boot
    try:
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, _sync_from_supabase)
    except Exception as e:
        log.warning("Async Supabase sync warning: %s", e)
    # Pre-warm model in background
    asyncio.create_task(_warm_model())
    yield
    log.info("Attendly Python Recognition Engine shutting down.")

async def _warm_model():
    try:
        await get_face_app()
    except Exception as exc:
        log.warning("Model pre-warm warning: %s", exc)

app = FastAPI(
    title="Attendly Python Face Recognition API",
    version="2.0.0",
    description="High-FPS Walk-by Biometric Recognition Backend",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────────────────
# REST Endpoints
# ──────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "service": "Attendly Python Recognition Backend",
        "status": "online",
        "health": "/health",
        "enrolled_count": len(students),
    }

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "engine": "Python InsightFace (SCRFD + MobileFaceNet ArcFace)",
        "model_ready": _face_app is not None,
        "enrolled_count": len(students),
        "walk_by_optimized": True,
    }

@app.get("/students")
async def list_students():
    return [
        {
            "id": sid,
            **data["meta"],
            "embeddingCount": len(data.get("embeddings", [])),
        }
        for sid, data in students.items()
    ]

@app.delete("/students")
async def clear_all_students():
    """Clear all enrolled students from database."""
    count = len(students)
    students.clear()
    _save_db(students)
    log.info("Cleared all %d students from Python database", count)
    return {"success": True, "cleared_count": count}

@app.delete("/students/{student_id}")
async def delete_student(student_id: str):
    import urllib.parse
    clean_id = urllib.parse.unquote(student_id).strip()
    
    # Try exact match first
    target_key = None
    if clean_id in students:
        target_key = clean_id
    else:
        for k in list(students.keys()):
            if k.strip().lower() == clean_id.lower() or k.strip() == clean_id:
                target_key = k
                break

    if target_key:
        del students[target_key]
        _save_db(students)
        _delete_student_from_supabase(target_key)
        log.info("Removed student %s from Python database and Supabase Cloud", target_key)
        return {"success": True, "deleted": target_key}

    # If already not in DB, return success to remain idempotent
    log.info("Student %s already absent from Python database", clean_id)
    return {"success": True, "already_deleted": True, "id": clean_id}

class EnrollJsonRequest(BaseModel):
    student_id: str
    student_name: str
    student_class: str
    nickname: str = ""
    gender: str = "L"
    parent_name: str = ""
    parent_phone: str = ""
    image_base64: str

@app.post("/enroll-base64")
async def enroll_student_json(req: EnrollJsonRequest):
    """Enroll student using a base64 encoded photo snapshot from web canvas with omni-angle multi-vector extraction."""
    face_app = await get_face_app()

    try:
        bgr = _decode_base64_str(req.image_base64)
    except Exception as exc:
        raise HTTPException(400, f"Cannot decode base64 image: {exc}")

    embeddings, best_score = _extract_omni_angle_embeddings(face_app, bgr)
    if not embeddings:
        raise HTTPException(422, "No face detected in enrollment image. Please try again.")

    sid = req.student_id
    call_name = req.nickname or req.student_name.split()[0]

    if sid not in students:
        students[sid] = {
            "meta": {
                "id": sid,
                "name": req.student_name,
                "nickname": call_name,
                "class": req.student_class,
                "gender": req.gender,
                "parentName": req.parent_name,
                "parentPhone": req.parent_phone,
                "enrolledAt": time.strftime("%Y-%m-%d %H:%M:%S"),
            },
            "embeddings": [],
        }

    for emb in embeddings:
        students[sid]["embeddings"].append(emb)

    # Cap at 20 embeddings per student to preserve memory and fast matching
    if len(students[sid]["embeddings"]) > 20:
        students[sid]["embeddings"] = students[sid]["embeddings"][-20:]

    _save_db(students)
    _save_student_to_supabase(students[sid]["meta"], students[sid]["embeddings"])
    log.info("Enrolled %s (%s). Total omni-angle embeddings: %d", req.student_name, sid, len(students[sid]["embeddings"]))

    return {
        "success": True,
        "student_id": sid,
        "name": req.student_name,
        "embedding_count": len(students[sid]["embeddings"]),
        "det_score": round(float(best_score), 3),
        "angles_registered": len(embeddings),
    }

class StudentSyncItem(BaseModel):
    id: str
    name: str
    class_name: str = "10-IPA-1"
    nickname: str = ""
    gender: str = "L"
    parent_name: str = ""
    parent_phone: str = ""
    photo_base64: str = ""

@app.post("/sync-students")
async def sync_students(items: list[StudentSyncItem]):
    face_app = await get_face_app()
    synced_count = 0
    for it in items:
        if not it.photo_base64:
            continue
        try:
            bgr = _decode_base64_str(it.photo_base64)
            embeddings, _ = _extract_omni_angle_embeddings(face_app, bgr)
            if not embeddings:
                continue
            call_name = it.nickname or it.name.split()[0]
            if it.id not in students:
                students[it.id] = {
                    "meta": {
                        "id": it.id,
                        "name": it.name,
                        "nickname": call_name,
                        "class": it.class_name,
                        "gender": it.gender,
                        "parentName": it.parent_name,
                        "parentPhone": it.parent_phone,
                        "enrolledAt": time.strftime("%Y-%m-%d %H:%M:%S"),
                    },
                    "embeddings": [],
                }
            for emb in embeddings:
                students[it.id]["embeddings"].append(emb)
            if len(students[it.id]["embeddings"]) > 20:
                students[it.id]["embeddings"] = students[it.id]["embeddings"][-20:]
            synced_count += 1
        except Exception as e:
            log.warning("Sync error for %s: %s", it.name, e)
    _save_db(students)
    _save_student_to_supabase(students[student_id]["meta"], students[student_id]["embeddings"])
    return {"status": "ok", "synced_count": synced_count, "total_enrolled": len(students)}

@app.post("/enroll")
async def enroll_student_multipart(
    student_id: str = Form(...),
    student_name: str = Form(...),
    student_class: str = Form(...),
    student_gender: str = Form("L"),
    parent_name: str = Form(""),
    parent_phone: str = Form(""),
    nickname: str = Form(""),
    image: UploadFile = File(...),
):
    """Multipart enrollment endpoint with omni-angle multi-vector extraction."""
    face_app = await get_face_app()
    img_bytes = await image.read()

    try:
        bgr = _decode_image_bytes(img_bytes)
    except Exception as exc:
        raise HTTPException(422, f"Invalid image format: {exc}")

    embeddings, best_score = _extract_omni_angle_embeddings(face_app, bgr)
    if not embeddings:
        raise HTTPException(422, "No face detected in image. Please ensure face is visible.")

    call_name = nickname or student_name.split()[0]
    if student_id not in students:
        students[student_id] = {
            "meta": {
                "id": student_id,
                "name": student_name,
                "nickname": call_name,
                "class": student_class,
                "gender": student_gender,
                "parentName": parent_name,
                "parentPhone": parent_phone,
                "enrolledAt": time.strftime("%Y-%m-%d %H:%M:%S"),
            },
            "embeddings": [],
        }

    for emb in embeddings:
        students[student_id]["embeddings"].append(emb)
    if len(students[student_id]["embeddings"]) > 20:
        students[student_id]["embeddings"] = students[student_id]["embeddings"][-20:]

    _save_db(students)
    _save_student_to_supabase(students[student_id]["meta"], students[student_id]["embeddings"])
    return {
        "success": True,
        "student_id": student_id,
        "embedding_count": len(students[student_id]["embeddings"]),
        "det_score": round(float(best_score), 3),
        "angles_registered": len(embeddings),
    }

# ──────────────────────────────────────────────────────────
# WebSocket Endpoint: High-Speed Walk-by Frame Stream
# ──────────────────────────────────────────────────────────

@app.websocket("/ws/detect")
async def ws_detect(websocket: WebSocket):
    """
    Real-time frame ingestion over WebSocket for passive walk-by recognition.
    Accepts:
      - Binary JPEG byte buffers (fastest)
      - JSON string `{ "image": "data:image/jpeg;base64,..." }`
    Returns JSON detection results with bounding boxes and matched student IDs.
    """
    await websocket.accept()
    log.info("WebSocket /ws/detect connected from %s", websocket.client)

    try:
        face_app = await get_face_app()
    except Exception as exc:
        await websocket.send_json({"error": f"Model init failed: {exc}"})
        await websocket.close(1011)
        return

    frame_durations: list[float] = []

    try:
        while True:
            # Receive either binary data or text
            message = await websocket.receive()
            if message.get("type") == "websocket.disconnect":
                log.info("WebSocket /ws/detect client disconnected gracefully")
                break

            if "bytes" in message and message["bytes"]:
                raw_bytes = message["bytes"]
            elif "text" in message and message["text"]:
                text_content = message["text"]
                try:
                    parsed = json.loads(text_content)
                    raw_b64 = parsed.get("image", "")
                    if "," in raw_b64:
                        raw_b64 = raw_b64.split(",", 1)[1]
                    raw_bytes = base64.b64decode(raw_b64)
                except Exception:
                    # Raw text could be plain base64
                    raw_bytes = base64.b64decode(text_content)
            else:
                continue

            t_start = time.perf_counter()

            try:
                bgr = _decode_image_bytes(raw_bytes)
            except Exception:
                await websocket.send_json({"error": "Failed to decode frame buffer"})
                continue

            # Run SCRFD face detection & ArcFace embedding extraction
            h_img, w_img = bgr.shape[:2]
            faces_raw = face_app.get(bgr)

            detected_faces = []
            for idx, face in enumerate(faces_raw):
                # Bounding box coordinates
                x1, y1, x2, y2 = face.bbox.astype(int)
                bx = max(0, int(x1))
                by = max(0, int(y1))
                bw = max(1, int(x2 - x1))
                bh = max(1, int(y2 - y1))

                # Normalize box in percent (0 - 100) for resolution-independent frontend display
                x_pct = round((bx / w_img) * 100, 2)
                y_pct = round((by / h_img) * 100, 2)
                w_pct = round((bw / w_img) * 100, 2)
                h_pct = round((bh / h_img) * 100, 2)

                # Compute full 3D head pose and topological landmarks for all face parts (atas, bawah, samping)
                pose_info, lms_info, cov_info = _compute_omni_face_topology(face, w_img, h_img)

                # Match against enrolled students with adaptive omni-angle threshold
                student_id, student_name, student_nickname, student_class, sim = _match_against_students(
                    face.embedding.astype(np.float32),
                    is_angled=pose_info["is_angled"],
                    threshold=0.44,
                    angled_threshold=0.38,
                )

                matched = student_id is not None
                effective_th = 0.38 if pose_info["is_angled"] else 0.44
                confidence_pct = round(min(99.9, max(75.0, 75.0 + (sim - effective_th) / (1.0 - effective_th) * 24.9)), 1) if matched else 0.0

                detected_faces.append({
                    "trackId": f"P{idx + 1}",
                    "box": {
                        "x": x_pct,
                        "y": y_pct,
                        "w": w_pct,
                        "h": h_pct,
                    },
                    "pxBox": {
                        "x": bx,
                        "y": by,
                        "w": bw,
                        "h": bh,
                    },
                    "det_score": round(float(face.det_score), 3),
                    "matched": matched,
                    "studentId": student_id,
                    "studentName": student_name,
                    "studentNickname": student_nickname,
                    "studentClass": student_class,
                    "similarity": round(sim, 3),
                    "confidence": f"{confidence_pct}%",
                    "pose": pose_info,
                    "angle": pose_info["pose_label"],
                    "landmarks": lms_info,
                    "coverage": cov_info,
                })

            elapsed = time.perf_counter() - t_start
            frame_durations.append(elapsed)
            if len(frame_durations) > 20:
                frame_durations.pop(0)

            avg_sec = sum(frame_durations) / len(frame_durations)
            fps_estimate = round(1.0 / avg_sec) if avg_sec > 0 else 0

            await websocket.send_json({
                "ts": int(time.time() * 1000),
                "faces": detected_faces,
                "fps": fps_estimate,
                "proc_ms": round(elapsed * 1000, 1),
                "enrolled_count": len(students),
            })

    except (WebSocketDisconnect, RuntimeError):
        log.info("WebSocket /ws/detect client disconnected")
    except Exception as exc:
        log.exception("WebSocket /ws/detect exception: %s", exc)

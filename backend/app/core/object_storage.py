"""Emergent Object Storage client — verbatim from the integration playbook.

One module-level `storage_key` is initialised once (call `init_storage()` from
FastAPI startup). All uploads use ``put_object(path, data, content_type)`` and
serve via the backend proxy endpoint (never expose the storage URL directly).
"""
import logging
import os

import requests

logger = logging.getLogger(__name__)

_STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() \
    or "https://integrations.emergentagent.com"
STORAGE_URL = _STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"

APP_NAME = "sitera"

_storage_key = None


def init_storage():
    """Initialise the object-storage session key. Idempotent."""
    global _storage_key
    if _storage_key:
        return _storage_key
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise RuntimeError("EMERGENT_LLM_KEY missing from environment")
    resp = requests.post(f"{STORAGE_URL}/init",
                          json={"emergent_key": api_key}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    logger.info("Object storage initialised")
    return _storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    """Upload bytes. Returns {'path': '...', 'size': N, 'etag': ...}."""
    key = init_storage()
    resp = requests.put(f"{STORAGE_URL}/objects/{path}",
                          headers={"X-Storage-Key": key, "Content-Type": content_type},
                          data=data, timeout=120)
    resp.raise_for_status()
    return resp.json()


def get_object(path: str) -> tuple[bytes, str]:
    """Download an object as (bytes, content_type)."""
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}",
                          headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

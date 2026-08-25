"""In-memory TTL cache for public, near-static GET endpoints.

Purpose
-------
Many public endpoints (site settings, navbar, footer-menu, hero, etc.) return
data that only changes when an admin updates it. Hitting the database on every
single request wastes DB connections and was the primary cause of
QueuePool exhaustion under concurrent load.

This cache keeps responses in memory for a short TTL (default 5 minutes).
Write endpoints (PUT/POST/DELETE) call `cache.invalidate(key)` so stale data
is purged immediately after an admin save.

Constraints
-----------
- Thread-safe via `threading.Lock` (sync SQLAlchemy runs in anyio threadpool).
- Single-process only. If the server runs with multiple uvicorn workers, each
  worker has its own cache and invalidation won't propagate. The short TTL is
  the safety net in that scenario. For multi-process deployments, migrate to
  Redis with the same interface.
- `--reload` (dev mode) restarts the process on code changes, clearing the
  cache. This is expected in development.
- Stored values are deep-copied on retrieval so endpoints cannot accidentally
  mutate the cached object.
"""

import copy
import logging
import time
from threading import Lock
from typing import Any, Optional

logger = logging.getLogger(__name__)

DEFAULT_TTL: float = 300.0  # 5 minutes


class TTLCache:
    """Thread-safe in-memory cache with per-key TTL and instrumentation."""

    def __init__(self) -> None:
        self._store: dict[str, tuple[Any, float, float]] = {}
        # value, set_timestamp, ttl
        self._lock = Lock()
        # Counters for observability.
        self._hits = 0
        self._misses = 0
        self._sets = 0
        self._invalidations = 0

    def get(self, key: str, ttl: float = DEFAULT_TTL) -> Optional[Any]:
        """Return a deep copy of the cached value if fresh, else None."""
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                self._misses += 1
                return None
            value, ts, stored_ttl = entry
            effective_ttl = stored_ttl if stored_ttl else ttl
            if (time.time() - ts) >= effective_ttl:
                # Expired — evict and miss.
                self._store.pop(key, None)
                self._misses += 1
                return None
            self._hits += 1
            return copy.deepcopy(value)

    def set(self, key: str, value: Any, ttl: Optional[float] = None) -> None:
        with self._lock:
            self._store[key] = (copy.deepcopy(value), time.time(), ttl if ttl is not None else 0.0)
            self._sets += 1

    def invalidate(self, key: str) -> None:
        with self._lock:
            existed = key in self._store
            self._store.pop(key, None)
            if existed:
                self._invalidations += 1
        if existed:
            logger.debug("Cache invalidated: %s", key)

    def invalidate_many(self, keys: list[str]) -> None:
        with self._lock:
            for key in keys:
                if key in self._store:
                    self._invalidations += 1
                    self._store.pop(key, None)

    def clear(self) -> int:
        """Clear the entire cache. Returns the number of entries removed."""
        with self._lock:
            count = len(self._store)
            self._store.clear()
            self._invalidations += count
        logger.debug("Cache cleared: %d entries", count)
        return count

    def stats(self) -> dict[str, Any]:
        """Return cache stats + per-key detail for monitoring/admin endpoint."""
        with self._lock:
            now = time.time()
            keys_detail: list[dict[str, Any]] = []
            total_hits = self._hits
            total_misses = self._misses
            for key, (_value, ts, stored_ttl) in self._store.items():
                ttl_val = stored_ttl if stored_ttl else DEFAULT_TTL
                age = now - ts
                keys_detail.append({
                    "key": key,
                    "age_seconds": round(age, 1),
                    "ttl_seconds": round(ttl_val, 1),
                    "remaining_seconds": round(max(0.0, ttl_val - age), 1),
                    "expired": age >= ttl_val,
                })
            # Sort by remaining seconds ascending (closest to expiry first).
            keys_detail.sort(key=lambda k: k["remaining_seconds"])
            total_requests = total_hits + total_misses
            hit_rate = round(total_hits / total_requests, 4) if total_requests > 0 else 0.0
            return {
                "entries": len(self._store),
                "hits": total_hits,
                "misses": total_misses,
                "sets": self._sets,
                "invalidations": self._invalidations,
                "hit_rate": hit_rate,
                "keys": keys_detail,
            }

    def reset_stats(self) -> None:
        """Reset only the counters (hits/misses/sets/invalidations), not the cache."""
        with self._lock:
            self._hits = 0
            self._misses = 0
            self._sets = 0
            self._invalidations = 0


# Module-level singleton imported across routers.
cache = TTLCache()

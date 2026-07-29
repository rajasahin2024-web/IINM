"""add database tables for extended About page content

Revision ID: d3e4f5a6b7c8
Revises: c1d2e3f4a5b6
Create Date: 2026-07-17 14:23:00.000000
"""
from __future__ import annotations

import json
import os
from typing import Sequence, Union

from alembic import context, op
import sqlalchemy as sa

revision: str = "d3e4f5a6b7c8"
down_revision: Union[str, Sequence[str], None] = "c1d2e3f4a5b6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _legacy_file_path() -> str:
    backend_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    return os.path.join(backend_root, "uploads", "about_extended.json")


def _load_legacy_data() -> dict:
    path = _legacy_file_path()
    if not os.path.exists(path):
        return {}
    try:
        with open(path, "r", encoding="utf-8") as file:
            data = json.load(file)
    except (OSError, json.JSONDecodeError) as exc:
        raise RuntimeError("Unable to read legacy About extended content") from exc
    return data if isinstance(data, dict) else {}


def upgrade() -> None:
    offline_mode = context.is_offline_mode()
    bind = None if offline_mode else op.get_bind()
    existing_tables = set() if offline_mode else set(sa.inspect(bind).get_table_names())

    if "about_founder" not in existing_tables:
        op.create_table(
            "about_founder",
            sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
            sa.Column("slot_key", sa.String(length=50), nullable=False),
            sa.Column("name", sa.String(length=255), nullable=False),
            sa.Column("role", sa.String(length=255), nullable=False),
            sa.Column("bio", sa.Text(), nullable=False),
            sa.Column("quote", sa.Text(), nullable=True),
            sa.Column("image_url", sa.Text(), nullable=True),
            sa.Column("video_url", sa.String(length=512), nullable=True),
            sa.Column("order_index", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=True, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        )
        op.create_index("ix_about_founder_id", "about_founder", ["id"], unique=False)
        op.create_index("ix_about_founder_slot_key", "about_founder", ["slot_key"], unique=True)

    if "about_gallery_item" not in existing_tables:
        op.create_table(
            "about_gallery_item",
            sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
            sa.Column("public_id", sa.String(length=100), nullable=False),
            sa.Column("image_url", sa.Text(), nullable=False),
            sa.Column("caption", sa.String(length=500), nullable=True),
            sa.Column("order_index", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=True, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        )
        op.create_index("ix_about_gallery_item_id", "about_gallery_item", ["id"], unique=False)
        op.create_index("ix_about_gallery_item_public_id", "about_gallery_item", ["public_id"], unique=True)

    if "about_timeline_item" not in existing_tables:
        op.create_table(
            "about_timeline_item",
            sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
            sa.Column("public_id", sa.String(length=100), nullable=False),
            sa.Column("year", sa.String(length=50), nullable=False),
            sa.Column("title", sa.String(length=255), nullable=False),
            sa.Column("description", sa.Text(), nullable=False),
            sa.Column("icon_name", sa.String(length=50), nullable=True),
            sa.Column("order_index", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=True, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        )
        op.create_index("ix_about_timeline_item_id", "about_timeline_item", ["id"], unique=False)
        op.create_index("ix_about_timeline_item_public_id", "about_timeline_item", ["public_id"], unique=True)

    data = _load_legacy_data()
    if not data:
        return

    founder_table = sa.table(
        "about_founder",
        sa.column("slot_key", sa.String()),
        sa.column("name", sa.String()),
        sa.column("role", sa.String()),
        sa.column("bio", sa.Text()),
        sa.column("quote", sa.Text()),
        sa.column("image_url", sa.Text()),
        sa.column("video_url", sa.String()),
        sa.column("order_index", sa.Integer()),
    )
    gallery_table = sa.table(
        "about_gallery_item",
        sa.column("public_id", sa.String()),
        sa.column("image_url", sa.Text()),
        sa.column("caption", sa.String()),
        sa.column("order_index", sa.Integer()),
    )
    timeline_table = sa.table(
        "about_timeline_item",
        sa.column("public_id", sa.String()),
        sa.column("year", sa.String()),
        sa.column("title", sa.String()),
        sa.column("description", sa.Text()),
        sa.column("icon_name", sa.String()),
        sa.column("order_index", sa.Integer()),
    )

    founders = []
    for index, slot_key in enumerate(("founder1", "founder2")):
        item = data.get(slot_key)
        if not isinstance(item, dict) or not item.get("name") or not item.get("role") or not item.get("bio"):
            continue
        founders.append({
            "slot_key": slot_key,
            "name": item["name"],
            "role": item["role"],
            "bio": item["bio"],
            "quote": item.get("quote") or "",
            "image_url": item.get("image_url"),
            "video_url": item.get("video_url"),
            "order_index": index,
        })
    if founders and (offline_mode or not bind.execute(sa.select(sa.func.count()).select_from(founder_table)).scalar()):
        op.bulk_insert(founder_table, founders)

    gallery = []
    for index, item in enumerate(data.get("gallery", [])):
        if not isinstance(item, dict) or not item.get("id") or not item.get("image_url"):
            continue
        gallery.append({
            "public_id": item["id"],
            "image_url": item["image_url"],
            "caption": item.get("caption") or "",
            "order_index": index,
        })
    if gallery and (offline_mode or not bind.execute(sa.select(sa.func.count()).select_from(gallery_table)).scalar()):
        op.bulk_insert(gallery_table, gallery)

    timeline = []
    for index, item in enumerate(data.get("timeline", [])):
        if not isinstance(item, dict) or not item.get("id") or not item.get("year") or not item.get("title") or not item.get("description"):
            continue
        timeline.append({
            "public_id": item["id"],
            "year": item["year"],
            "title": item["title"],
            "description": item["description"],
            "icon_name": item.get("icon_name") or "Target",
            "order_index": index,
        })
    if timeline and (offline_mode or not bind.execute(sa.select(sa.func.count()).select_from(timeline_table)).scalar()):
        op.bulk_insert(timeline_table, timeline)


def downgrade() -> None:
    pass

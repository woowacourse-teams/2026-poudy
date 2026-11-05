#!/usr/bin/env python3
"""Validate an explicit service transfer bundle and emit transactional psql input. Never connects to a DB."""
import argparse
import json
import re
from datetime import datetime
from pathlib import Path

RATINGS = {"recommended", "not_recommended", "mixed", "neutral", "uncertain"}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def text(value):
    return isinstance(value, str) and bool(value.strip()) and "\x00" not in value


def number(value, minimum=0):
    return type(value) is int and value >= minimum


def timestamp(value):
    require(text(value) and datetime.fromisoformat(value.replace("Z", "+00:00")).tzinfo is not None,
            "timestamp must include timezone")


def unique(rows, key):
    result = {key(row): row for row in rows}
    require(len(result) == len(rows), "duplicate identity")
    return result


def validate(bundle):
    require(bundle["schema_version"] == "youtube-service-transfer/v1", "unsupported schema")
    require(re.fullmatch(r"[a-f0-9]{64}", bundle["source_batch_hash"]), "invalid source hash")
    channels = unique(bundle["channels"], lambda r: r["id"])
    videos = unique(bundle["videos"], lambda r: r["id"])
    products = unique(bundle["products"], lambda r: r["id"])
    pairs = unique(bundle["video_products"], lambda r: (r["video_id"], r["product_id"]))
    mentions = unique(bundle["mentions"], lambda r: (r["video_id"], r["ordinal"]))
    require(channels and videos and pairs and mentions, "empty bundle")
    for row in channels.values():
        require(text(row["id"]) and len(row["id"]) <= 64 and text(row["name"]), "invalid channel")
        require(row.get("subscriber_count") is None or number(row["subscriber_count"]), "invalid subscriber count")
        timestamp(row["metadata_checked_at"])
    for row in videos.values():
        require(re.fullmatch(r"[A-Za-z0-9_-]{11}", row["id"]) and row["channel_id"] in channels, "invalid video")
        require(text(row["title"]) and number(row["duration_ms"], 1), "invalid video content")
        require(row.get("view_count") is None or number(row["view_count"]), "invalid view count")
        require(type(row["visible"]) is bool, "visibility must be explicit")
        timestamp(row["published_at"])
        timestamp(row["metadata_checked_at"])
    for row in products.values():
        require(number(row["id"], 1) and text(row["name"]) and text(row["brand_name"]), "invalid product identity")
    for (video, product), row in pairs.items():
        require(video in videos and product in products and row["recommendation"] in RATINGS, "invalid video product")
    covered = set()
    for row in mentions.values():
        pair = (row["video_id"], row["product_id"])
        require(pair in pairs and number(row["ordinal"], 1), "unmapped mention")
        require(text(row["spoken_name"]) and text(row["summary"]), "missing source speech or summary")
        require(row["recommendation"] in RATINGS, "invalid assessment")
        require(number(row["start_ms"]) and row["start_ms"] < videos[row["video_id"]]["duration_ms"], "invalid start")
        end = row.get("end_ms")
        require(end is None or number(end) and row["start_ms"] < end <= videos[row["video_id"]]["duration_ms"], "invalid end")
        if row["recommendation"] in {"mixed", "not_recommended", "uncertain"}:
            require(pairs[pair]["recommendation"] != "recommended", "opposing segment cannot count as recommendation")
        covered.add(pair)
    require(covered == set(pairs), "mapping without speech")
    for pair, row in pairs.items():
        if row["recommendation"] == "recommended":
            require(any((m["video_id"], m["product_id"]) == pair and m["recommendation"] == "recommended"
                        for m in mentions.values()), "recommendation without evidence")


def literal(value):
    return "'" + value.replace("'", "''") + "'"


def sql(bundle, database):
    validate(bundle)
    require(text(database), "expected database is required")
    data = literal(json.dumps(bundle, ensure_ascii=False))
    expected = literal(database)
    return f"""\\set ON_ERROR_STOP on
BEGIN;
SET LOCAL standard_conforming_strings = on;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SELECT pg_advisory_xact_lock(hashtext('poudy-youtube-import'));
CREATE TEMP TABLE youtube_transfer(data jsonb) ON COMMIT DROP;
INSERT INTO youtube_transfer VALUES ({data}::jsonb);
CREATE TEMP TABLE youtube_target(database_name text) ON COMMIT DROP;
INSERT INTO youtube_target VALUES ({expected});
-- Lock names before comparing them; a concurrent product/brand rename must wait.
SELECT p.id FROM product p JOIN brand b ON b.id=p.brand_id JOIN youtube_transfer t ON EXISTS (
 SELECT 1 FROM jsonb_array_elements(t.data->'products') x WHERE (x->>'id')::bigint=p.id
) FOR SHARE OF p,b;
DO $check$
BEGIN
 IF current_database() <> (select database_name from youtube_target) THEN
  RAISE EXCEPTION 'Wrong database';
 END IF;
 IF EXISTS (
   select 1 from youtube_transfer t cross join lateral jsonb_to_recordset(t.data->'products')
     as x(id bigint,name text,brand_name text)
   left join product p on p.id=x.id left join brand b on b.id=p.brand_id
   where p.id is null or normalize(p.product_name,NFC)<>normalize(x.name,NFC)
     or normalize(b.korean_name,NFC)<>normalize(x.brand_name,NFC)
 ) THEN RAISE EXCEPTION 'Product ID/name/brand mismatch; no product is created'; END IF;
END $check$;
INSERT INTO youtube_channel(id,name,handle,subscriber_count,profile_image_url,banner_image_url,metadata_checked_at)
SELECT x.id,x.name,x.handle,x.subscriber_count,x.profile_image_url,x.banner_image_url,x.metadata_checked_at AT TIME ZONE 'Asia/Seoul' FROM youtube_transfer t CROSS JOIN LATERAL jsonb_to_recordset(t.data->'channels')
AS x(id text,name text,handle text,subscriber_count bigint,profile_image_url text,banner_image_url text,metadata_checked_at timestamptz)
ON CONFLICT(id) DO UPDATE SET name=excluded.name,handle=excluded.handle,subscriber_count=excluded.subscriber_count,
 profile_image_url=excluded.profile_image_url,banner_image_url=excluded.banner_image_url,metadata_checked_at=excluded.metadata_checked_at;
-- Only the explicitly supplied videos are replaced. Channel Order is retained.
DELETE FROM youtube_video_product WHERE video_id IN (
 SELECT x->>'id' FROM youtube_transfer t CROSS JOIN LATERAL jsonb_array_elements(t.data->'videos') x);
INSERT INTO youtube_video(id,channel_id,title,description,thumbnail_url,duration_ms,published_at,view_count,visible,metadata_checked_at)
SELECT x.id,x.channel_id,x.title,x.description,x.thumbnail_url,x.duration_ms,x.published_at AT TIME ZONE 'Asia/Seoul',x.view_count,x.visible,x.metadata_checked_at AT TIME ZONE 'Asia/Seoul' FROM youtube_transfer t CROSS JOIN LATERAL jsonb_to_recordset(t.data->'videos')
AS x(id text,channel_id text,title text,description text,thumbnail_url text,duration_ms bigint,published_at timestamptz,view_count bigint,visible boolean,metadata_checked_at timestamptz)
ON CONFLICT(id) DO UPDATE SET channel_id=excluded.channel_id,title=excluded.title,description=excluded.description,
 thumbnail_url=excluded.thumbnail_url,duration_ms=excluded.duration_ms,published_at=excluded.published_at,
 view_count=excluded.view_count,visible=excluded.visible,metadata_checked_at=excluded.metadata_checked_at;
INSERT INTO youtube_video_product(video_id,product_id,recommendation)
SELECT x.* FROM youtube_transfer t CROSS JOIN LATERAL jsonb_to_recordset(t.data->'video_products')
AS x(video_id text,product_id bigint,recommendation text);
INSERT INTO youtube_product_mention(video_id,source_ordinal,product_id,spoken_name,start_ms,end_ms,summary,recommendation,recommendation_condition,source_batch_hash)
SELECT x.*,t.data->>'source_batch_hash' FROM youtube_transfer t CROSS JOIN LATERAL jsonb_to_recordset(t.data->'mentions')
AS x(video_id text,ordinal integer,product_id bigint,spoken_name text,start_ms bigint,end_ms bigint,summary text,recommendation text,recommendation_condition text);
COMMIT;
"""


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("bundle", type=Path)
    parser.add_argument("--expected-database", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    args.output.write_text(sql(json.loads(args.bundle.read_text()), args.expected_database))
    print(f"Validated SQL written to {args.output}; no database connection made")

package com.poudy.notice.repository;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.notice.domain.Notice;
import com.poudy.notice.domain.NoticeStatus;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class NoticeRepository {
    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
    private static final RowMapper<Notice> ROW = (r, n) -> new Notice(
        r.getObject("id", UUID.class),
        r.getString("title"),
        r.getString("content"),
        NoticeStatus.valueOf(r.getString("status")),
        r.getBoolean("banner_enabled"),
        r.getString("banner_text"),
        at(r.getObject("first_published_at", LocalDateTime.class)),
        r.getLong("view_count"),
        at(r.getObject("created_at", LocalDateTime.class)),
        at(r.getObject("updated_at", LocalDateTime.class))
    );
    private final NamedParameterJdbcTemplate jdbc;
    public NoticeRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Notice find(UUID id, boolean lock) {
        return jdbc.query(
            "select * from notice where id=:id" + (lock ? " for update" : ""),
            new MapSqlParameterSource("id", id),
            ROW
        ).stream().findFirst().orElseThrow(() -> new ResourceNotFoundException(ErrorCode.NOTICE_NOT_FOUND));
    }

    public List<Notice> list(String q, NoticeStatus status, long offset, int size, boolean banners) {
        return jdbc.query(
            "select * from notice where (:status='' or status=:status) and strpos(lower(title),lower(:q))>0"
                + (banners ? " and banner_enabled" : "")
                + " order by first_published_at desc nulls last,created_at desc,id desc offset :offset limit :size",
            params(q, status).addValue("offset", offset).addValue("size", size),
            ROW
        );
    }

    public List<Notice> adminList(String q, NoticeStatus status, long offset, int size, boolean oldest) {
        return jdbc.query(
            "select * from notice where (:status='' or status=:status) and strpos(lower(title),lower(:q))>0 order by created_at "
                + (oldest ? "asc" : "desc") + ",id " + (oldest ? "asc" : "desc") + " offset :offset limit :size",
            params(q, status).addValue("offset", offset).addValue("size", size),
            ROW
        );
    }

    public long count(String q, NoticeStatus status) {
        return jdbc.queryForObject(
            "select count(*) from notice where (:status='' or status=:status) and strpos(lower(title),lower(:q))>0",
            params(q, status),
            Long.class
        );
    }

    public long bannerCount() {
        return jdbc.queryForObject(
            "select count(*) from notice where status='PUBLISHED' and banner_enabled",
            new MapSqlParameterSource(),
            Long.class
        );
    }

    public void create(Notice n) {
        jdbc.update(
            "insert into notice(id,title,content,status,banner_enabled,banner_text,first_published_at,created_at,updated_at) values(:id,:title,:content,:status,:enabled,:text,:published,:created,:updated)",
            values(n)
        );
    }

    public void update(Notice n) {
        jdbc.update(
            "update notice set title=:title,content=:content,status=:status,banner_enabled=:enabled,banner_text=:text,first_published_at=:published,updated_at=:updated where id=:id",
            values(n)
        );
    }

    public void delete(UUID id) {
        jdbc.update("delete from notice where id=:id", new MapSqlParameterSource("id", id));
    }

    public void view(UUID id) {
        if (jdbc.update(
            "update notice set view_count=view_count+1 where id=:id and status='PUBLISHED'",
            new MapSqlParameterSource("id", id)
        ) != 1) {
            throw new ResourceNotFoundException(ErrorCode.NOTICE_NOT_FOUND);
        }
    }

    private static MapSqlParameterSource params(String q, NoticeStatus status) {
        return new MapSqlParameterSource("q", q == null ? "" : q)
            .addValue("status", status == null ? "" : status.name());
    }

    private static MapSqlParameterSource values(Notice n) {
        return new MapSqlParameterSource("id", n.id()).addValue("title", n.title()).addValue("content", n.content())
            .addValue("status", n.status().name()).addValue("enabled", n.bannerEnabled())
            .addValue("text", n.bannerText()).addValue("published", local(n.firstPublishedAt()))
            .addValue("created", local(n.createdAt())).addValue("updated", local(n.updatedAt()));
    }

    private static LocalDateTime local(OffsetDateTime t) {
        return t == null ? null : t.atZoneSameInstant(SEOUL).toLocalDateTime();
    }

    private static OffsetDateTime at(LocalDateTime t) {
        return t == null ? null : t.atZone(SEOUL).toOffsetDateTime();
    }
}

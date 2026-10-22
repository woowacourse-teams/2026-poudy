package com.poudy.inquiry.repository;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.feedback.domain.FeedbackStatus;
import com.poudy.inquiry.domain.InquiryEvent;
import com.poudy.inquiry.domain.InquiryItem;
import com.poudy.inquiry.domain.InquiryKind;
import com.poudy.inquiry.domain.InquiryMemo;
import com.poudy.inquiry.domain.InquiryQuery;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class InquiryRepository {
    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
    private static final String SOURCE = """
        (select 'FEEDBACK' kind,f.id,f.subject_type type,f.content,null::text product_name,null::text brand_name,f.page_path path,f.status,f.assigned,f.created_at,f.management_updated_at from feedback f
        union all
        select 'PRODUCT_CORRECTION',c.id,'PRODUCT_CORRECTION',c.content,p.product_name,b.korean_name,'/products/'||p.id,c.status,c.assigned,c.created_at,c.management_updated_at from product_correction_request c join product p on p.id=c.product_id join brand b on b.id=p.brand_id
        union all
        select 'PRODUCT_REGISTRATION',r.id,'PRODUCT_REGISTRATION',r.product_name,r.product_name,r.brand_name,null::text,r.status,r.assigned,r.created_at,r.management_updated_at from product_request r) i
        """;
    private static final String CONDITION = """
        where (:q='' or strpos(lower(coalesce(content,'')||' '||coalesce(product_name,'')||' '||coalesce(brand_name,'')||' '||id::text||' '||coalesce(path,'')),lower(:q))>0)
        and (:status='' or status=:status) and (:type='' or type=:type)
        and (:assigned='' or assigned::text=:assigned)
        and (cast(:from as timestamp) is null or created_at>=cast(:from as timestamp))
        and (cast(:to as timestamp) is null or created_at<cast(:to as timestamp))
        """;
    private static final RowMapper<InquiryItem> ITEM = (r, n) -> new InquiryItem(
        InquiryKind.valueOf(r.getString("kind")),
        r.getObject("id", UUID.class),
        r.getString("type"),
        r.getString("content"),
        r.getString("product_name"),
        r.getString("brand_name"),
        r.getString("path"),
        FeedbackStatus.valueOf(r.getString("status")),
        r.getBoolean("assigned"),
        at(r.getObject("created_at", LocalDateTime.class)),
        at(r.getObject("management_updated_at", LocalDateTime.class))
    );
    private final NamedParameterJdbcTemplate jdbc;
    public InquiryRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<InquiryItem> find(InquiryQuery query, long offset, int size) {
        return jdbc.query(
            "select * from " + SOURCE + CONDITION + " order by created_at " + (query.oldest() ? "asc" : "desc")
                + ",kind,id " + (query.oldest() ? "asc" : "desc") + " offset :offset limit :size",
            params(query).addValue("offset", offset).addValue("size", size),
            ITEM
        );
    }

    public com.poudy.inquiry.domain.InquiryNavigation neighbors(InquiryQuery query, InquiryKind kind, UUID id) {
        String order = "created_at " + (query.oldest() ? "asc" : "desc") + ",kind,id "
            + (query.oldest() ? "asc" : "desc");
        String sql = "select * from (select kind,id,lag(kind) over(order by " + order
            + ") previous_kind,lag(id) over(order by " + order + ") previous_id,lead(kind) over(order by " + order
            + ") next_kind,lead(id) over(order by " + order + ") next_id,row_number() over(order by " + order
            + ") position,count(*) over() total from " + SOURCE + CONDITION + ") ranked where kind=:kind and id=:id";
        return jdbc.query(
            sql,
            params(query).addValue("kind", kind.name()).addValue("id", id),
            (r, n) -> new com.poudy.inquiry.domain.InquiryNavigation(
                r.getString("previous_kind") == null ? null
                    : new com.poudy.inquiry.domain.InquiryNeighbor(
                        InquiryKind.valueOf(r.getString("previous_kind")),
                        r.getObject("previous_id", UUID.class)
                    ),
                r.getString("next_kind") == null ? null
                    : new com.poudy.inquiry.domain.InquiryNeighbor(
                        InquiryKind.valueOf(r.getString("next_kind")),
                        r.getObject("next_id", UUID.class)
                    ),
                r.getLong("position"),
                r.getLong("total")
            )
        ).stream().findFirst().orElseThrow(() -> new ResourceNotFoundException(ErrorCode.FEEDBACK_NOT_FOUND));
    }

    public long count(InquiryQuery query) {
        return jdbc.queryForObject("select count(*) from " + SOURCE + CONDITION, params(query), Long.class);
    }

    public InquiryItem detail(InquiryKind kind, UUID id) {
        return jdbc.query(
            "select * from " + SOURCE + " where kind=:kind and id=:id",
            new MapSqlParameterSource("kind", kind.name()).addValue("id", id),
            ITEM
        ).stream().findFirst().orElseThrow(() -> new ResourceNotFoundException(ErrorCode.FEEDBACK_NOT_FOUND));
    }

    public Map<String, Long> summary() {
        Map<String, Long> result = new LinkedHashMap<>();
        jdbc.query("select status,count(*) n from " + SOURCE + " group by status", r -> {
            result.put(r.getString("status"), r.getLong("n"));
        });
        result.put(
            "TODAY",
            jdbc.queryForObject(
                "select count(*) from " + SOURCE + " where created_at>=(now() AT TIME ZONE 'Asia/Seoul')::date",
                new MapSqlParameterSource(),
                Long.class
            )
        );
        return result;
    }

    public void lock(InquiryKind kind, UUID id) {
        if (jdbc.query(
            "select id from " + table(kind) + " where id=:id for update",
            new MapSqlParameterSource("id", id),
            (r, n) -> r.getObject(1)
        ).isEmpty()) {
            throw new ResourceNotFoundException(ErrorCode.FEEDBACK_NOT_FOUND);
        }
    }

    public void status(InquiryKind kind, UUID id, FeedbackStatus status) {
        jdbc.update(
            "update " + table(
                kind
            ) + " set status=:status,status_changed_at=(now() AT TIME ZONE 'Asia/Seoul') where id=:id and status<>:status",
            new MapSqlParameterSource("id", id).addValue("status", status.name())
        );
    }

    public void assign(InquiryKind kind, UUID id, boolean assigned) {
        jdbc.update(
            "update " + table(kind) + " set assigned=:assigned where id=:id and assigned<>:assigned",
            new MapSqlParameterSource("id", id).addValue("assigned", assigned)
        );
    }

    public void memo(InquiryKind kind, UUID id, String content) {
        var p = new MapSqlParameterSource("id", id).addValue("content", content).addValue("event", UUID.randomUUID());
        var occurredAt = jdbc.queryForObject(
            "update " + table(kind)
                + " set management_updated_at=greatest(clock_timestamp() AT TIME ZONE 'Asia/Seoul',management_updated_at+interval '1 microsecond') where id=:id returning management_updated_at",
            p,
            (r, n) -> r.getObject(1, LocalDateTime.class)
        );
        p.addValue("occurredAt", occurredAt);
        jdbc.update(
            "insert into admin_inquiry_event(id," + fk(kind)
                + ",event_type,memo,occurred_at) values(:event,:id,'MEMO_ADDED',:content,:occurredAt)",
            p
        );
    }

    public List<InquiryMemo> memos(InquiryKind kind, UUID id) {
        return jdbc.query(
            "select id,memo,occurred_at from admin_inquiry_event where " + fk(kind)
                + "=:id and event_type='MEMO_ADDED' order by occurred_at,id",
            new MapSqlParameterSource("id", id),
            (r, n) -> new InquiryMemo(
                r.getObject("id", UUID.class),
                r.getString("memo"),
                at(r.getObject("occurred_at", LocalDateTime.class))
            )
        );
    }

    public List<InquiryEvent> events(InquiryKind kind, UUID id) {
        return jdbc.query(
            "select * from admin_inquiry_event where " + fk(kind) + "=:id order by occurred_at,id",
            new MapSqlParameterSource("id", id),
            (r, n) -> new InquiryEvent(
                r.getObject("id", UUID.class),
                r.getString("event_type"),
                r.getString("previous_value"),
                r.getString("current_value"),
                r.getString("memo"),
                at(r.getObject("occurred_at", LocalDateTime.class))
            )
        );
    }

    private static String table(InquiryKind kind) {
        return switch (kind) {
            case FEEDBACK -> "feedback";
            case PRODUCT_CORRECTION -> "product_correction_request";
            case PRODUCT_REGISTRATION -> "product_request";
        };
    }

    private static String fk(InquiryKind kind) {
        return switch (kind) {
            case FEEDBACK -> "feedback_id";
            case PRODUCT_CORRECTION -> "correction_request_id";
            case PRODUCT_REGISTRATION -> "product_request_id";
        };
    }

    private static OffsetDateTime at(LocalDateTime value) {
        return value.atZone(SEOUL).toOffsetDateTime();
    }

    private static MapSqlParameterSource params(InquiryQuery q) {
        return new MapSqlParameterSource("q", Objects.requireNonNullElse(q.q(), ""))
            .addValue("status", q.status() == null ? "" : q.status().name())
            .addValue("type", Objects.requireNonNullElse(q.type(), ""))
            .addValue("assigned", q.assigned() == null ? "" : q.assigned().toString())
            .addValue("from", q.from() == null ? null : q.from().atZoneSameInstant(SEOUL).toLocalDateTime())
            .addValue("to", q.to() == null ? null : q.to().atZoneSameInstant(SEOUL).toLocalDateTime());
    }
}

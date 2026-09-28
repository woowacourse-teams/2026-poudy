package com.poudy.productrequest.repository;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.productrequest.domain.ProductRequest;
import com.poudy.productrequest.domain.ProductRequestStatus;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class ProductRequestRepository {

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
    private static final RowMapper<ProductRequest> REQUEST = (rs, row) -> {
        ProductRequestStatus status = ProductRequestStatus.valueOf(rs.getString("status"));
        OffsetDateTime changedAt = rs.getObject("status_changed_at", LocalDateTime.class)
            .atZone(SEOUL).toOffsetDateTime();
        return new ProductRequest(
            rs.getObject("id", UUID.class),
            rs.getString("product_name"),
            rs.getString("brand_name"),
            rs.getObject("created_at", LocalDateTime.class).atZone(SEOUL).toOffsetDateTime(),
            status,
            changedAt,
            status == ProductRequestStatus.COMPLETED ? changedAt : null
        );
    };
    private final NamedParameterJdbcTemplate jdbc;

    public ProductRequestRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional
    public void save(ProductRequest request) {
        jdbc.update(
            """
                insert into product_request (id, product_name, brand_name, created_at, status, status_changed_at)
                values (:id, :productName, :brandName, :createdAt, :status, :changedAt)
                """,
            new MapSqlParameterSource()
                .addValue("id", request.requestId())
                .addValue("productName", request.productName())
                .addValue("brandName", request.brandName())
                .addValue("createdAt", local(request.requestedAt()))
                .addValue("status", request.status().name())
                .addValue("changedAt", local(request.statusChangedAt()))
        );
    }

    public boolean exists(UUID requestId) {
        return Boolean.TRUE.equals(
            jdbc.queryForObject(
                "select exists(select 1 from product_request where id = :id)",
                new MapSqlParameterSource("id", requestId),
                Boolean.class
            )
        );
    }

    public boolean updateStatus(ProductRequestStatus expected, ProductRequest request) {
        return jdbc.update(
            """
                update product_request set status = :status, status_changed_at = :changedAt
                where id = :id and status = :expected
                """,
            new MapSqlParameterSource()
                .addValue("id", request.requestId())
                .addValue("expected", expected.name())
                .addValue("status", request.status().name())
                .addValue("changedAt", local(request.statusChangedAt()))
        ) == 1;
    }

    public ProductRequest findById(UUID requestId) {
        return jdbc.query(
            "select * from product_request where id = :id",
            new MapSqlParameterSource("id", requestId),
            REQUEST
        ).stream().findFirst()
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.PRODUCT_REQUEST_NOT_FOUND));
    }

    public List<ProductRequest> findAll(ProductRequestStatus status) {
        if (status == null) {
            return jdbc.query("select * from product_request order by created_at desc, id desc", REQUEST);
        }
        return jdbc.query(
            "select * from product_request where status = :status order by created_at desc, id desc",
            new MapSqlParameterSource("status", status.name()),
            REQUEST
        );
    }

    private static LocalDateTime local(OffsetDateTime value) {
        return value.atZoneSameInstant(SEOUL).toLocalDateTime();
    }
}

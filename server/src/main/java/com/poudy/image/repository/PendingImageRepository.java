package com.poudy.image.repository;

import com.poudy.image.domain.ImagePurpose;
import com.poudy.image.domain.PendingImage;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class PendingImageRepository {

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    private final NamedParameterJdbcTemplate jdbc;

    public PendingImageRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void save(PendingImage image, Instant createdAt) {
        jdbc.update(
            "insert into pending_image (id, purpose, created_at) values (:id, :purpose, :createdAt)",
            new MapSqlParameterSource()
                .addValue("id", image.id())
                .addValue("purpose", image.purpose().name())
                .addValue("createdAt", local(createdAt))
        );
    }

    public void discard(List<UUID> ids, ImagePurpose purpose) {
        ids.forEach(
            id -> jdbc.update(
                "insert into pending_image (id, purpose, created_at) values (:id, :purpose, :createdAt) on conflict (id) do nothing",
                new MapSqlParameterSource()
                    .addValue("id", id)
                    .addValue("purpose", purpose.name())
                    .addValue("createdAt", local(PendingImage.discardedAt()))
            )
        );
    }

    public List<UUID> claim(List<UUID> ids, ImagePurpose purpose, Instant now) {
        if (ids.isEmpty()) {
            return List.of();
        }
        return jdbc.query(
            "delete from pending_image where id in (:ids) and purpose = :purpose and created_at > :claimableSince"
                + " returning id",
            new MapSqlParameterSource()
                .addValue("ids", ids)
                .addValue("purpose", purpose.name())
                .addValue("claimableSince", local(PendingImage.claimableSince(now))),
            (rs, row) -> rs.getObject("id", UUID.class)
        );
    }

    public List<PendingImage> findExpired(Instant now, int size) {
        return jdbc.query(
            "select id, purpose from pending_image where created_at <= :cutoff order by created_at, id limit :size",
            new MapSqlParameterSource()
                .addValue("cutoff", local(PendingImage.cleanupCutoff(now)))
                .addValue("size", size),
            (rs, row) -> new PendingImage(
                rs.getObject("id", UUID.class),
                ImagePurpose.valueOf(rs.getString("purpose"))
            )
        );
    }

    public void delete(UUID id) {
        jdbc.update("delete from pending_image where id = :id", new MapSqlParameterSource("id", id));
    }

    private static LocalDateTime local(Instant value) {
        return LocalDateTime.ofInstant(value, SEOUL);
    }
}

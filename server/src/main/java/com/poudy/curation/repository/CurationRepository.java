package com.poudy.curation.repository;

import com.poudy.curation.domain.Curation;
import com.poudy.curation.domain.CurationPublicationStatus;
import com.poudy.exception.InfrastructureException;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.SqlArrayValue;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Repository
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class CurationRepository {
    private final NamedParameterJdbcTemplate jdbc;
    private final CurationDocumentCodec codec = new CurationDocumentCodec();

    public CurationRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<Curation> findPublishedById(Long id) {
        return jdbc.query(
            "select * from curation where id = :id and publication_status = 'PUBLISHED'",
            new MapSqlParameterSource("id", id),
            (rs, row) -> read(rs)
        ).stream().findFirst();
    }

    public Set<Long> findPublishedIds(List<Long> ids) {
        if (ids.isEmpty()) {
            return Set.of();
        }
        return Set.copyOf(jdbc.queryForList("""
            select id from curation where id = any(:ids) and publication_status = 'PUBLISHED'
            """, Map.of("ids", new SqlArrayValue("bigint", ids.stream().distinct().toArray())), Long.class));
    }

    private Curation read(ResultSet rs) throws SQLException {
        long id = rs.getLong("id");
        try {
            return new Curation(
                id,
                rs.getString("title"),
                rs.getString("description"),
                CurationPublicationStatus.valueOf(rs.getString("publication_status")),
                codec.decode(rs.getString("blocks"))
            );
        } catch (IllegalArgumentException exception) {
            throw new InfrastructureException("큐레이션 데이터가 올바르지 않습니다. id=" + id, exception);
        }
    }
}

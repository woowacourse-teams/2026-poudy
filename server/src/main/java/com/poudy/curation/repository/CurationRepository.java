package com.poudy.curation.repository;

import com.poudy.curation.domain.Curation;
import com.poudy.curation.domain.CurationPublicationStatus;
import com.poudy.curation.domain.Curations;
import com.poudy.exception.InfrastructureException;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Optional;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
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

    public Curations findAll() {
        return Curations.from(jdbc.query("select * from curation order by position", (rs, row) -> read(rs)));
    }

    public Optional<Curation> findPublishedById(Long id) {
        return Curations.from(
            jdbc.query(
                "select * from curation where id = :id",
                new MapSqlParameterSource("id", id),
                (rs, row) -> read(rs)
            )
        ).findPublishedById(id);
    }

    private Curation read(ResultSet rs) throws SQLException {
        long id = rs.getLong("id");
        try {
            return new Curation(
                id,
                rs.getString("title"),
                rs.getString("description"),
                CurationPublicationStatus.valueOf(rs.getString("publication_status")),
                rs.getBoolean("banner_visible"),
                rs.getString("banner_thumbnail_image_url"),
                codec.decode(rs.getString("blocks"))
            );
        } catch (IllegalArgumentException exception) {
            throw new InfrastructureException("큐레이션 데이터가 올바르지 않습니다. id=" + id, exception);
        }
    }
}

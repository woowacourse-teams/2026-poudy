package com.poudy.banner.repository;

import com.poudy.banner.domain.Banner;
import com.poudy.banner.domain.BannerSlot;
import com.poudy.exception.InfrastructureException;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class BannerRepository {
    private final NamedParameterJdbcTemplate jdbc;
    private final BannerTargetCodec codec = new BannerTargetCodec();

    public BannerRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<Banner> findVisible(BannerSlot slot) {
        return jdbc.query("""
            select id, title, description, image_url, target from banner
            where slot = :slot and visible order by display_order, id
            """, Map.of("slot", slot.name()), (rs, row) -> {
            long id = rs.getLong("id");
            try {
                return new Banner(
                    id,
                    rs.getString("title"),
                    rs.getString("description"),
                    rs.getString("image_url"),
                    codec.decode(rs.getString("target"))
                );
            } catch (IllegalArgumentException exception) {
                throw new InfrastructureException("배너 데이터가 올바르지 않습니다. id=" + id, exception);
            }
        });
    }

}

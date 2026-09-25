package com.poudy.curation.repository;

import com.poudy.curation.domain.Curation;
import com.poudy.curation.domain.CurationBlock;
import com.poudy.curation.domain.CurationFilter;
import com.poudy.curation.domain.CurationProductMapping;
import com.poudy.curation.domain.CurationPublicationStatus;
import com.poudy.curation.domain.Curations;
import com.poudy.exception.InfrastructureException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Repository
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class CurationRepository {

    private static final RowMapper<CurationRow> CURATION = (rs, row) -> new CurationRow(
        rs.getLong("id"),
        rs.getString("title"),
        rs.getString("description"),
        CurationPublicationStatus.valueOf(rs.getString("publication_status")),
        rs.getBoolean("banner_visible"),
        rs.getString("banner_thumbnail_image_url")
    );

    private final NamedParameterJdbcTemplate jdbc;

    public CurationRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Curations findAll() {
        return load(
            jdbc.query(
                "select * from curation order by position",
                CURATION
            )
        );
    }

    public Optional<Curation> findPublishedById(Long id) {
        List<CurationRow> rows = jdbc.query(
            "select * from curation where id = :id",
            new MapSqlParameterSource("id", id),
            CURATION
        );
        return load(rows).findPublishedById(id);
    }

    private Curations load(List<CurationRow> curations) {
        try {
            return assemble(curations);
        } catch (IllegalArgumentException exception) {
            throw new InfrastructureException("큐레이션 데이터가 올바르지 않습니다.", exception);
        }
    }

    private Curations assemble(List<CurationRow> curations) {
        if (curations.isEmpty()) {
            return Curations.from(List.of());
        }
        List<Long> curationIds = curations.stream().map(CurationRow::id).toList();
        List<BlockRow> blocks = jdbc.query(
            """
                select id, curation_id, type, spacing_top, spacing_bottom, image_url
                from curation_block where curation_id in (:ids) order by curation_id, position
                """,
            new MapSqlParameterSource("ids", curationIds),
            (rs, row) -> new BlockRow(
                rs.getObject("id", UUID.class),
                rs.getLong("curation_id"),
                rs.getString("type"),
                rs.getInt("spacing_top"),
                rs.getInt("spacing_bottom"),
                rs.getString("image_url")
            )
        );
        List<UUID> blockIds = blocks.stream().map(BlockRow::id).toList();
        Map<UUID, List<CurationFilter>> filters = loadFilters(blockIds);
        Map<UUID, LinkedHashMap<Long, List<UUID>>> products = loadProducts(blockIds);
        Map<Long, List<CurationBlock>> assembledBlocks = new LinkedHashMap<>();
        for (BlockRow block : blocks) {
            List<CurationBlock> group = assembledBlocks
                .computeIfAbsent(block.curationId(), ignored -> new ArrayList<>());
            LinkedHashMap<Long, List<UUID>> mappings = products.getOrDefault(block.id(), new LinkedHashMap<>());
            group.add(switch (block.type()) {
                case "IMAGE" -> CurationBlock.image(block.id(), block.top(), block.bottom(), block.imageUrl());
                case "PRODUCTS" -> CurationBlock.products(
                    block.id(),
                    block.top(),
                    block.bottom(),
                    List.copyOf(mappings.keySet())
                );
                case "PRODUCTS_BY_FILTER" -> CurationBlock.productsByFilter(
                    block.id(),
                    block.top(),
                    block.bottom(),
                    filters.getOrDefault(block.id(), List.of()),
                    mappings.entrySet().stream()
                        .map(entry -> new CurationProductMapping(entry.getKey(), entry.getValue()))
                        .toList()
                );
                default -> throw new IllegalArgumentException("알 수 없는 큐레이션 블록 타입: " + block.type());
            });
        }
        return Curations.from(
            curations.stream().map(
                row -> new Curation(
                    row.id(),
                    row.title(),
                    row.description(),
                    row.status(),
                    row.bannerVisible(),
                    row.thumbnail(),
                    assembledBlocks.getOrDefault(row.id(), List.of())
                )
            ).toList()
        );
    }

    private Map<UUID, List<CurationFilter>> loadFilters(List<UUID> blockIds) {
        if (blockIds.isEmpty()) {
            return Map.of();
        }
        Map<UUID, List<CurationFilter>> filters = new LinkedHashMap<>();
        jdbc.query("""
            select block_id, id, label from curation_block_filter
            where block_id in (:ids) order by block_id, position
            """, new MapSqlParameterSource("ids", blockIds), rs -> {
            UUID blockId = rs.getObject("block_id", UUID.class);
            filters.computeIfAbsent(blockId, ignored -> new ArrayList<>())
                .add(new CurationFilter(rs.getObject("id", UUID.class), rs.getString("label")));
        });
        return filters;
    }

    private Map<UUID, LinkedHashMap<Long, List<UUID>>> loadProducts(List<UUID> blockIds) {
        if (blockIds.isEmpty()) {
            return Map.of();
        }
        Map<UUID, LinkedHashMap<Long, List<UUID>>> products = new LinkedHashMap<>();
        jdbc.query("""
            select product.block_id, product.product_id, filter.filter_id
            from curation_block_product product
            left join curation_block_product_filter filter
                on filter.block_id = product.block_id and filter.product_id = product.product_id
            where product.block_id in (:ids)
            order by product.block_id, product.position, filter.position
            """, new MapSqlParameterSource("ids", blockIds), rs -> {
            UUID blockId = rs.getObject("block_id", UUID.class);
            Long productId = rs.getLong("product_id");
            List<UUID> filterIds = products.computeIfAbsent(blockId, ignored -> new LinkedHashMap<>())
                .computeIfAbsent(productId, ignored -> new ArrayList<>());
            UUID filterId = rs.getObject("filter_id", UUID.class);
            if (filterId != null) {
                filterIds.add(filterId);
            }
        });
        return products;
    }

    private record CurationRow(
        Long id,
        String title,
        String description,
        CurationPublicationStatus status,
        boolean bannerVisible,
        String thumbnail) {
    }

    private record BlockRow(UUID id, Long curationId, String type, int top, int bottom, String imageUrl) {
    }
}

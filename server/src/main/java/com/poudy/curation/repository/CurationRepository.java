package com.poudy.curation.repository;

import static java.util.stream.Collectors.groupingBy;
import static java.util.stream.Collectors.mapping;
import static java.util.stream.Collectors.toList;

import com.poudy.common.persistence.SnapshotReader;
import com.poudy.curation.domain.CurationBlock;
import com.poudy.curation.domain.CurationFilter;
import com.poudy.curation.domain.Curations;
import com.poudy.exception.InfrastructureException;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Repository;

@Repository
public class CurationRepository {

    private final Curations curations;

    public CurationRepository(CurationJpaRepository curationJpaRepository, SnapshotReader snapshotReader) {
        this.curations = snapshotReader.read(() -> load(curationJpaRepository));
    }

    private static Curations load(CurationJpaRepository curationJpaRepository) {
        Map<UUID, List<CurationFilter>> filters = curationJpaRepository.findAllFilters().stream()
            .collect(
                groupingBy(CurationBlockFilterEntity::blockId, mapping(CurationBlockFilterEntity::toDomain, toList()))
            );
        Map<UUID, Map<Long, List<UUID>>> productFilterIds = curationJpaRepository.findAllProductFilters()
            .stream()
            .map(CurationBlockProductFilterEntity::id)
            .collect(
                groupingBy(
                    CurationBlockProductFilterId::blockId,
                    groupingBy(
                        CurationBlockProductFilterId::productId,
                        mapping(CurationBlockProductFilterId::filterId, toList())
                    )
                )
            );
        Map<UUID, List<Long>> productIds = curationJpaRepository.findAllProducts().stream()
            .map(CurationBlockProductEntity::id)
            .collect(groupingBy(CurationBlockProductId::blockId, mapping(CurationBlockProductId::productId, toList())));
        try {
            Map<Long, List<CurationBlock>> blocks = curationJpaRepository.findAllBlocks().stream()
                .collect(
                    groupingBy(
                        CurationBlockEntity::curationId,
                        mapping(
                            block -> block.toDomain(
                                filters.getOrDefault(block.id(), List.of()),
                                productIds.getOrDefault(block.id(), List.of()),
                                productFilterIds.getOrDefault(block.id(), Map.of())
                            ),
                            toList()
                        )
                    )
                );
            return Curations.from(
                curationJpaRepository.findAllCurations().stream()
                    .map(curation -> curation.toDomain(blocks.getOrDefault(curation.id(), List.of())))
                    .toList()
            );
        } catch (IllegalArgumentException exception) {
            throw new InfrastructureException("큐레이션 데이터가 올바르지 않습니다.", exception);
        }
    }

    public Curations findAll() {
        return curations;
    }
}

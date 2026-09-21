package com.poudy.curation.repository;

import static java.util.stream.Collectors.groupingBy;
import static java.util.stream.Collectors.mapping;
import static java.util.stream.Collectors.toList;

import com.poudy.curation.domain.Curation;
import com.poudy.curation.domain.CurationBlock;
import com.poudy.curation.domain.CurationFilter;
import com.poudy.curation.domain.Curations;
import com.poudy.exception.InfrastructureException;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Repository
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class CurationRepository {

    private final CurationJpaRepository repository;

    public CurationRepository(CurationJpaRepository repository) {
        this.repository = repository;
    }

    public Optional<Curation> findById(Long id) {
        return load(repository, id).findById(id);
    }

    private static Curations load(CurationJpaRepository curationJpaRepository, Long id) {
        Map<UUID, List<CurationFilter>> filters = curationJpaRepository.findFilters(id).stream()
            .collect(
                groupingBy(CurationBlockFilterEntity::blockId, mapping(CurationBlockFilterEntity::toDomain, toList()))
            );
        Map<UUID, Map<Long, List<UUID>>> productFilterIds = curationJpaRepository.findProductFilters(id)
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
        Map<UUID, List<Long>> productIds = curationJpaRepository.findProducts(id).stream()
            .map(CurationBlockProductEntity::id)
            .collect(groupingBy(CurationBlockProductId::blockId, mapping(CurationBlockProductId::productId, toList())));
        try {
            Map<Long, List<CurationBlock>> blocks = curationJpaRepository.findBlocks(id).stream()
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
                curationJpaRepository.findCurations(id).stream()
                    .map(curation -> curation.toDomain(blocks.getOrDefault(curation.id(), List.of())))
                    .toList()
            );
        } catch (IllegalArgumentException exception) {
            throw new InfrastructureException("큐레이션 데이터가 올바르지 않습니다.", exception);
        }
    }

    public Curations findAll() {
        return load(repository, null);
    }
}

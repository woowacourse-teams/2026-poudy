package com.poudy.tag.repository;

import com.poudy.common.persistence.SnapshotReader;
import com.poudy.tag.domain.Tags;
import org.springframework.stereotype.Repository;

@Repository
public class TagRepository {

    private final Tags tags;

    public TagRepository(TagJpaRepository tagJpaRepository, SnapshotReader snapshotReader) {
        this.tags = snapshotReader.read(() -> Tags.from(tagJpaRepository.findAllByOrderByIdAsc()));
    }

    public Tags findAll() {
        return tags;
    }
}

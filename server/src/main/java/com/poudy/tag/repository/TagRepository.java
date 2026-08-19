package com.poudy.tag.repository;

import com.poudy.common.json.JsonDataReader;
import com.poudy.exception.InfrastructureException;
import com.poudy.tag.domain.Tag;
import com.poudy.tag.domain.Tags;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Repository;

@Repository
public class TagRepository {

    private static final String TAGS_FILE_NAME = "tags.json";

    private final Tags tags;

    public TagRepository(JsonDataReader jsonDataReader) {
        List<Tag> values = jsonDataReader.readList(TAGS_FILE_NAME, Tag.class);
        validateUniqueIds(values);
        this.tags = new Tags(values);
    }

    public Tags findAll() {
        return tags;
    }

    private static void validateUniqueIds(List<Tag> values) {
        List<Long> duplicateIds = values.stream()
                .collect(Collectors.groupingBy(Tag::id, Collectors.counting()))
                .entrySet().stream()
                .filter(entry -> entry.getValue() > 1)
                .map(Map.Entry::getKey)
                .sorted()
                .toList();
        if (!duplicateIds.isEmpty()) {
            throw new InfrastructureException("태그 ID가 중복되었습니다: %s".formatted(duplicateIds));
        }
    }
}

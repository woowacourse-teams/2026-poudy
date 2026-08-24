package com.poudy.tag.repository;

import com.poudy.common.json.JsonDataReader;
import com.poudy.tag.domain.Tag;
import com.poudy.tag.domain.Tags;
import java.util.List;
import org.springframework.stereotype.Repository;

@Repository
public class TagRepository {

    private static final String TAGS_FILE_NAME = "tags.json";

    private final Tags tags;

    public TagRepository(JsonDataReader jsonDataReader) {
        List<Tag> values = jsonDataReader.readList(TAGS_FILE_NAME, Tag.class);
        this.tags = Tags.from(values);
    }

    public Tags findAll() {
        return tags;
    }

}

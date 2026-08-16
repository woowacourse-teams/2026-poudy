package com.poudy.excludecode.repository;

import com.poudy.common.json.JsonDataReader;
import com.poudy.excludecode.domain.ExcludeCodeMapping;
import java.util.List;
import org.springframework.stereotype.Repository;

@Repository
public class ExcludeCodeRepository {

    private static final String EXCLUDE_CODES_FILE_NAME = "exclude_codes.json";

    private final List<ExcludeCodeMapping> mappings;

    public ExcludeCodeRepository(JsonDataReader jsonDataReader) {
        this.mappings = jsonDataReader.readList(EXCLUDE_CODES_FILE_NAME, ExcludeCodeMapping.class);
    }

    public List<ExcludeCodeMapping> findAll() {
        return mappings;
    }
}

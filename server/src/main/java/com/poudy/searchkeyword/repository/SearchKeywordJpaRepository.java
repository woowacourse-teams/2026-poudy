package com.poudy.searchkeyword.repository;

import com.poudy.searchkeyword.domain.dictionary.DictionaryEntry;
import java.util.List;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

public interface SearchKeywordJpaRepository extends Repository<DictionaryEntry, String> {

    @Query("select distinct entry from DictionaryEntry entry left join fetch entry.expressionKeys order by entry.id")
    List<DictionaryEntry> findAllEntries();
}

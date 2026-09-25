package com.poudy.searchkeyword.repository;

import com.poudy.exception.InfrastructureException;
import com.poudy.searchkeyword.domain.dictionary.DictionaryEntry;
import com.poudy.searchkeyword.domain.dictionary.DictionaryEntry.Status;
import com.poudy.searchkeyword.domain.dictionary.SearchKeywordDictionary;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class SearchKeywordDictionaryRepository {

    private static final Logger LOG = LoggerFactory.getLogger(SearchKeywordDictionaryRepository.class);

    private final JdbcTemplate jdbc;

    public SearchKeywordDictionaryRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public SearchKeywordDictionary read() {
        SearchKeywordDictionary dictionary = load();
        logLoaded(dictionary);
        return dictionary;
    }

    private SearchKeywordDictionary load() {
        try {
            List<DictionaryRow> rows = jdbc.query(
                """
                    select keyword.id, keyword.keyword, keyword.status, keyword.ranking_eligible,
                           expression.expression_key
                    from search_keyword keyword
                    left join search_keyword_expression expression on expression.keyword_id = keyword.id
                    order by keyword.id, expression.expression_key
                    """,
                (rs, row) -> new DictionaryRow(
                    rs.getString("id"),
                    rs.getString("keyword"),
                    Status.valueOf(rs.getString("status")),
                    rs.getBoolean("ranking_eligible"),
                    rs.getString("expression_key")
                )
            );
            Map<String, List<String>> expressions = new LinkedHashMap<>();
            for (DictionaryRow row : rows) {
                List<String> keys = expressions.computeIfAbsent(row.id(), ignored -> new ArrayList<>());
                if (row.expression() != null) {
                    keys.add(row.expression());
                }
            }
            Map<String, DictionaryRow> entries = new LinkedHashMap<>();
            rows.forEach(row -> entries.putIfAbsent(row.id(), row));
            return SearchKeywordDictionary.of(
                entries.values().stream()
                    .map(
                        row -> DictionaryEntry.of(
                            row.id(),
                            row.keyword(),
                            row.status(),
                            row.rankingEligible(),
                            expressions.get(row.id())
                        )
                    )
                    .toList()
            );
        } catch (IllegalArgumentException exception) {
            throw new InfrastructureException("검색어 사전 데이터가 올바르지 않습니다.", exception);
        }
    }

    private record DictionaryRow(
        String id,
        String keyword,
        Status status,
        boolean rankingEligible,
        String expression) {
    }

    private static void logLoaded(SearchKeywordDictionary dictionary) {
        LOG.info(
            "Search keyword dictionary loaded: activeEntries={}, expressionKeys={}, emptyEntries={}",
            dictionary.activeEntryCount(),
            dictionary.expressionCount(),
            dictionary.emptyActiveEntryCount()
        );
        dictionary.emptyActiveEntryIds().forEach(
            id -> LOG
                .warn("Active search keyword has no expressions: id={}", id)
        );
    }
}

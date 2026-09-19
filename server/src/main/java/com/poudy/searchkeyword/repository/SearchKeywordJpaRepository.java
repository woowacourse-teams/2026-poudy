package com.poudy.searchkeyword.repository;

import java.util.List;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

public interface SearchKeywordJpaRepository extends Repository<SearchKeywordEntity, String> {

    @Query("select keyword from SearchKeywordEntity keyword order by keyword.id")
    List<SearchKeywordEntity> findAllKeywords();

    @Query("select expression from SearchKeywordExpressionEntity expression"
        + " order by expression.keywordId, expression.expressionKey")
    List<SearchKeywordExpressionEntity> findAllExpressions();
}

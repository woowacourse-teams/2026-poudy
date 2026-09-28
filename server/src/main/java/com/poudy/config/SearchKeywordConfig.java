package com.poudy.config;

import com.poudy.searchkeyword.domain.SearchKeywordPolicy;
import com.poudy.searchkeyword.domain.bucket.BucketWindow;
import com.poudy.searchkeyword.domain.bucket.KeywordBuckets;
import com.poudy.searchkeyword.domain.ranking.RankingFallback;
import com.poudy.searchkeyword.domain.ranking.RankingPolicy;
import com.poudy.searchkeyword.repository.KeywordBucketRepository;
import com.poudy.searchkeyword.service.SearchKeywordSnapshot;
import java.time.Clock;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SearchKeywordConfig {

    @Bean
    public BucketWindow searchKeywordWindow() {
        return new BucketWindow(
            SearchKeywordPolicy.RANKING_HOURS,
            SearchKeywordPolicy.BUCKET_SECONDS,
            SearchKeywordPolicy.COMPARISON_BUCKETS
        );
    }

    @Bean
    public RankingPolicy searchKeywordRankingPolicy() {
        return new RankingPolicy(SearchKeywordPolicy.MIN_COUNT, SearchKeywordPolicy.RANKING_SIZE, Set.of());
    }

    @Bean
    public KeywordBuckets keywordBuckets(
        Clock clock,
        BucketWindow window,
        KeywordBucketRepository repository
    ) {
        return new KeywordBuckets(clock, window, repository);
    }

    @Bean
    public SearchKeywordSnapshot searchKeywordSnapshot() {
        return new SearchKeywordSnapshot();
    }

    @Bean
    public RankingFallback rankingFallback(@Value("${poudy.search-keywords.default-keywords:}") String configured) {
        return RankingFallback.configured(configured);
    }

}

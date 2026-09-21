package com.poudy.config;

import com.poudy.product.repository.ProductRepository;
import com.poudy.searchkeyword.domain.BucketWindow;
import com.poudy.searchkeyword.domain.KeywordBuckets;
import com.poudy.searchkeyword.domain.SearchKeywordPolicy;
import com.poudy.searchkeyword.domain.ranking.RankingFallback;
import com.poudy.searchkeyword.domain.ranking.RankingPolicy;
import com.poudy.searchkeyword.repository.KeywordBucketRepository;
import com.poudy.searchkeyword.repository.SearchKeywordDictionaryRepository;
import com.poudy.searchkeyword.service.KeywordSearch;
import com.poudy.searchkeyword.service.SearchKeywordRankingService;
import com.poudy.searchkeyword.service.SearchKeywordService;
import com.poudy.searchkeyword.service.SearchKeywordSnapshot;
import java.time.Clock;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

@Configuration
public class SearchKeywordConfig {

    private static final String PROPERTY_PREFIX = "poudy.search-keywords.";
    private static final List<String> DEFAULT_KEYWORDS = List.of(
        "토너",
        "선크림",
        "크림",
        "로션",
        "클렌징",
        "선스틱",
        "패드",
        "패치",
        "앰플",
        "에센스"
    );

    @Bean
    public KeywordSearch catalogKeywordSearch(ProductRepository products) {
        return products::hasSearchResults;
    }

    @Bean
    public SearchKeywordSnapshot searchKeywordSnapshot(SearchKeywordDictionaryRepository repository) {
        return new SearchKeywordSnapshot(repository.read());
    }

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
    public SearchKeywordService searchKeywordService(
        SearchKeywordSnapshot snapshot,
        KeywordBuckets buckets,
        KeywordSearch search
    ) {
        return new SearchKeywordService(snapshot, buckets, search);
    }

    @Bean
    public SearchKeywordRankingService searchKeywordRankingService(
        Environment env,
        SearchKeywordDictionaryRepository repository,
        KeywordBuckets buckets,
        KeywordSearch search,
        RankingPolicy rankingPolicy,
        SearchKeywordSnapshot snapshot,
        Clock clock
    ) {
        return new SearchKeywordRankingService(
            repository,
            buckets,
            search,
            rankingPolicy,
            RankingFallback.of(defaultKeywords(env)),
            snapshot,
            clock
        );
    }

    private static List<String> defaultKeywords(Environment env) {
        String configured = env.getProperty(PROPERTY_PREFIX + "default-keywords", "");
        if (configured.isBlank()) {
            return DEFAULT_KEYWORDS;
        }
        return Arrays.stream(configured.split(",")).map(String::trim).filter(keyword -> !keyword.isBlank()).toList();
    }

}

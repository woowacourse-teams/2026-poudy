package com.poudy.config;

import com.poudy.product.repository.ProductRepository;
import com.poudy.searchkeyword.domain.BucketWindow;
import com.poudy.searchkeyword.domain.KeywordBuckets;
import com.poudy.searchkeyword.domain.KeywordSearch;
import com.poudy.searchkeyword.domain.SearchKeywordDictionary;
import com.poudy.searchkeyword.domain.SearchKeywordPolicy;
import com.poudy.searchkeyword.domain.ranking.RankingFallback;
import com.poudy.searchkeyword.domain.ranking.RankingPolicy;
import com.poudy.searchkeyword.logging.KeywordStoreMonitor;
import com.poudy.searchkeyword.repository.KeywordSnapshotRepository;
import com.poudy.searchkeyword.repository.SearchKeywordDictionaryRepository;
import com.poudy.searchkeyword.service.KeywordMaintenance;
import com.poudy.searchkeyword.service.KeywordSnapshotWriter;
import com.poudy.searchkeyword.service.RankingRefresher;
import com.poudy.searchkeyword.service.SearchKeywordService;
import java.nio.file.Path;
import java.time.Clock;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import org.springframework.beans.factory.annotation.Qualifier;
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
    public Clock searchKeywordClock() {
        return Clock.systemUTC();
    }

    @Bean
    public KeywordSearch catalogKeywordSearch(ProductRepository products) {
        return new CatalogKeywordSearch(products);
    }

    @Bean
    public SearchKeywordDictionary searchKeywordDictionary(
        SearchKeywordDictionaryRepository repository,
        KeywordSearch search
    ) {
        return repository.read(search);
    }

    @Bean
    public KeywordSnapshotRepository keywordSnapshotRepository(Environment env) {
        return new KeywordSnapshotRepository(Path.of(env.getRequiredProperty(PROPERTY_PREFIX + "state-file")));
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
        @Qualifier("searchKeywordClock") Clock clock,
        BucketWindow window,
        KeywordSnapshotRepository repository
    ) {
        KeywordBuckets buckets = new KeywordBuckets(clock, window);
        repository.restoreInto(buckets);
        return buckets;
    }

    @Bean
    public SearchKeywordService searchKeywordService(
        Environment env,
        SearchKeywordDictionary dictionary,
        KeywordBuckets buckets,
        KeywordSearch search,
        RankingPolicy rankingPolicy
    ) {
        return new SearchKeywordService(
            dictionary,
            buckets,
            search,
            rankingPolicy,
            RankingFallback.of(defaultKeywords(env))
        );
    }

    private static List<String> defaultKeywords(Environment env) {
        String configured = env.getProperty(PROPERTY_PREFIX + "default-keywords", "");
        if (configured.isBlank()) {
            return DEFAULT_KEYWORDS;
        }
        return Arrays.stream(configured.split(",")).map(String::trim).filter(keyword -> !keyword.isBlank()).toList();
    }

    @Bean(destroyMethod = "saveBeforeShutdown")
    public KeywordSnapshotWriter keywordSnapshotWriter(KeywordBuckets buckets, KeywordSnapshotRepository repository) {
        return new KeywordSnapshotWriter(buckets, repository);
    }

    @Bean
    public KeywordMaintenance keywordMaintenance(KeywordBuckets buckets, KeywordSnapshotWriter writer) {
        return new KeywordMaintenance(writer, new KeywordStoreMonitor(buckets));
    }

    @Bean(destroyMethod = "shutdown")
    public ScheduledExecutorService searchKeywordScheduler(KeywordMaintenance maintenance) {
        ScheduledExecutorService scheduler = daemonScheduler("search-keyword-snapshot");
        scheduler.scheduleWithFixedDelay(
            maintenance,
            SearchKeywordPolicy.SAVE_INTERVAL_SECONDS,
            SearchKeywordPolicy.SAVE_INTERVAL_SECONDS,
            TimeUnit.SECONDS
        );
        return scheduler;
    }

    @Bean(destroyMethod = "shutdown")
    public ScheduledExecutorService searchKeywordRankingScheduler(
        SearchKeywordService service,
        KeywordBuckets buckets
    ) {
        ScheduledExecutorService scheduler = daemonScheduler("search-keyword-rankings");
        scheduler.execute(new RankingRefresher(service, buckets, scheduler));
        return scheduler;
    }

    private static ScheduledExecutorService daemonScheduler(String name) {
        return Executors.newSingleThreadScheduledExecutor(task -> {
            Thread thread = new Thread(task, name);
            thread.setDaemon(true);
            return thread;
        });
    }
}

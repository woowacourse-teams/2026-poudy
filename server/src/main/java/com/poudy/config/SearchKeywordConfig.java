package com.poudy.config;

import com.poudy.product.repository.ProductRepository;
import com.poudy.searchkeyword.domain.KeywordBuckets;
import com.poudy.searchkeyword.domain.SearchKeywordDictionary;
import com.poudy.searchkeyword.domain.SearchKeywordPolicy;
import com.poudy.searchkeyword.logging.KeywordResourceMonitor;
import com.poudy.searchkeyword.logging.KeywordStoreMonitor;
import com.poudy.searchkeyword.repository.KeywordReportRepository;
import com.poudy.searchkeyword.repository.KeywordSnapshotRepository;
import com.poudy.searchkeyword.repository.SearchKeywordDictionaryRepository;
import com.poudy.searchkeyword.service.KeywordMaintenance;
import com.poudy.searchkeyword.service.KeywordSnapshotWriter;
import com.poudy.searchkeyword.service.RankingRefresher;
import com.poudy.searchkeyword.service.SearchKeywordService;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.core.io.ResourceLoader;

@Configuration
public class SearchKeywordConfig {

    private static final String PROPERTY_PREFIX = "poudy.search-keywords.";
    private static final String DICTIONARY_FILE = "search_keywords.json";
    private static final List<String> CATALOG_FILES = List.of(
        "brands.json",
        "categories.json",
        "products.json",
        "ingredients.json",
        "tags.json",
        "exclude_codes.json"
    );
    private static final List<String> SEARCH_CLASSES = List.of(
        "com/poudy/search/domain/SearchKeyword.class",
        "com/poudy/product/domain/Products.class"
    );

    @Bean
    public Clock searchKeywordClock() {
        return Clock.systemUTC();
    }

    @Bean
    public SearchKeywordDictionary searchKeywordDictionary(
        Environment env,
        ResourceLoader resources,
        ProductRepository products
    )
        throws IOException {
        SearchKeywordDictionaryRepository repository = new SearchKeywordDictionaryRepository();
        CatalogKeywordSearch search = new CatalogKeywordSearch(products);
        String dataDirectory = dataDirectory(env);
        if (!dataDirectory.isBlank()) {
            return repository.read(Path.of(dataDirectory).resolve(DICTIONARY_FILE), search);
        }
        try (InputStream input = resources.getResource("classpath:" + DICTIONARY_FILE).getInputStream()) {
            return repository.read(input, search);
        }
    }

    @Bean
    public KeywordSnapshotRepository keywordSnapshotRepository(Environment env) throws IOException {
        return new KeywordSnapshotRepository(paths(env).stateFile(), SearchKeywordPolicy.RANKING_HOURS);
    }

    @Bean
    public KeywordBuckets keywordBuckets(
        @Qualifier("searchKeywordClock") Clock clock,
        KeywordSnapshotRepository repository
    ) {
        KeywordBuckets buckets = new KeywordBuckets(clock, SearchKeywordPolicy.RANKING_HOURS);
        repository.load().ifPresent(buckets::restore);
        return buckets;
    }

    @Bean
    public SearchKeywordService searchKeywordService(SearchKeywordDictionary dictionary, KeywordBuckets buckets) {
        return new SearchKeywordService(
            dictionary,
            buckets,
            SearchKeywordPolicy.MIN_COUNT,
            SearchKeywordPolicy.REPORT_MIN_COUNT,
            Set.of()
        );
    }

    @Bean
    public KeywordMaintenance keywordMaintenance(
        Environment env,
        ResourceLoader resources,
        KeywordBuckets buckets,
        KeywordSnapshotRepository repository,
        SearchKeywordService service,
        MeterRegistry metrics
    )
        throws IOException {
        KeywordSnapshotWriter writer = new KeywordSnapshotWriter(buckets, repository);
        registerSnapshotGauges(metrics, writer);
        return new KeywordMaintenance(
            writer,
            new KeywordStoreMonitor(buckets, "NONZERO", metrics),
            resourceMonitor(writer),
            reportExport(env, resources, service)
        );
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

    private static String dataDirectory(Environment env) {
        return env.getProperty("poudy.data-dir", "");
    }

    private static SearchKeywordPaths paths(Environment env) {
        return new SearchKeywordPaths(env.matchesProfiles("prod"), dataDirectory(env));
    }

    private static Runnable reportExport(Environment env, ResourceLoader resources, SearchKeywordService service)
        throws IOException {
        String reportFile = env.getProperty(PROPERTY_PREFIX + "report-file", "");
        if (reportFile.isBlank()) {
            return () -> {
            };
        }
        KeywordReportRepository repository = new KeywordReportRepository(paths(env).reportFile(reportFile));
        repository.discardPrevious();
        String catalogVersion = ResourceFingerprint.of(resources, dataDirectory(env), CATALOG_FILES);
        String searchVersion = searchVersion(env, resources);
        return () -> repository.save(service.report(catalogVersion, searchVersion));
    }

    private static String searchVersion(Environment env, ResourceLoader resources) throws IOException {
        String configured = env.getProperty(PROPERTY_PREFIX + "search-version", "");
        if (!configured.isBlank()) {
            return configured;
        }
        return "build-" + ResourceFingerprint.of(resources, "", SEARCH_CLASSES);
    }

    private static KeywordResourceMonitor resourceMonitor(KeywordSnapshotWriter writer) {
        return new KeywordResourceMonitor(
            writer::failureCount,
            () -> writer.lastSuccessfulSaveAt().map(Instant::getEpochSecond).orElse(-1L)
        );
    }

    private static void registerSnapshotGauges(MeterRegistry metrics, KeywordSnapshotWriter writer) {
        Gauge.builder("poudy.search.snapshot.failures", writer, KeywordSnapshotWriter::failureCount)
            .register(metrics);
        Gauge.builder("poudy.search.snapshot.last.success", writer, SearchKeywordConfig::lastSuccessEpochSecond)
            .register(metrics);
    }

    private static double lastSuccessEpochSecond(KeywordSnapshotWriter writer) {
        return writer.lastSuccessfulSaveAt().map(saved -> (double) saved.getEpochSecond()).orElse(Double.NaN);
    }

    private static ScheduledExecutorService daemonScheduler(String name) {
        return Executors.newSingleThreadScheduledExecutor(task -> {
            Thread thread = new Thread(task, name);
            thread.setDaemon(true);
            return thread;
        });
    }
}

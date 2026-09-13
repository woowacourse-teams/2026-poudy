package com.poudy.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;
import static org.junit.jupiter.api.Assertions.assertTimeout;

import com.poudy.productview.domain.ProductViews;
import com.poudy.productview.repository.ProductViewFileRepository;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.autoconfigure.task.TaskSchedulingAutoConfiguration;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.scheduling.annotation.ScheduledAnnotationBeanPostProcessor;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.scheduling.config.FixedDelayTask;

class ProductViewConfigTest {

    @TempDir
    Path directory;

    @Test
    void shutdownReleasesPausedSchedulerAndFlushes() throws Exception {
        Path file = directory.resolve("views.json");
        assertTimeout(
            Duration.ofSeconds(5),
            () -> runner(file).withPropertyValues("poudy.product-views.save-interval=PT1H")
                .run(context -> {
                    context.getBean(ProductViews.class).increaseViewCount(1L);
                    ThreadPoolTaskScheduler scheduler = context
                        .getBean("productViewScheduler", ThreadPoolTaskScheduler.class);
                    scheduler.stop();
                    scheduler.execute(() -> {
                    });
                    await().atMost(Duration.ofSeconds(2)).until(() -> scheduler.getActiveCount() == 1);
                })
        );
        assertThat(new ProductViewFileRepository(file).load().dailyCounts()).hasSize(1);
    }

    @Test
    void shutdownCancelsNextScheduledSaveAndFlushesImmediately() throws Exception {
        Path file = directory.resolve("views.json");
        assertTimeout(
            Duration.ofSeconds(5),
            () -> runner(file).withPropertyValues("poudy.product-views.save-interval=PT1H")
                .run(context -> context.getBean(ProductViews.class).increaseViewCount(1L))
        );
        assertThat(new ProductViewFileRepository(file).load().dailyCounts()).hasSize(1);
    }

    @Test
    void viewSchedulerDoesNotReplaceDefaultSchedulerForOtherBackgroundWork() {
        runner(directory.resolve("views.json"))
            .withConfiguration(AutoConfigurations.of(TaskSchedulingAutoConfiguration.class))
            .run(context -> {
                assertThat(context).hasNotFailed();
                assertThat(context.getBean("productViewScheduler")).isNotSameAs(context.getBean("taskScheduler"));
            });
    }

    @Test
    void defaultsToTenSecondsAndSavesOnShutdownThenRestores() throws Exception {
        Path file = directory.resolve("views.json");
        runner(file).run(context -> {
            assertThat(context).hasNotFailed();
            ScheduledAnnotationBeanPostProcessor scheduling = context
                .getBean(ScheduledAnnotationBeanPostProcessor.class);
            assertThat(scheduling.getScheduledTasks()).hasSize(1);
            FixedDelayTask task = (FixedDelayTask) scheduling.getScheduledTasks().iterator().next().getTask();
            assertThat(task.getIntervalDuration()).isEqualTo(Duration.ofSeconds(10));
            assertThat(task.getInitialDelayDuration()).isEqualTo(Duration.ofSeconds(10));
            context.getBean(ProductViews.class).increaseViewCount(1L);
            assertThat(Files.exists(file)).isFalse();
        });

        assertThat(new ProductViewFileRepository(file).load().dailyCounts()).hasSize(1);
        runner(file).run(context -> assertThat(context.getBean(ProductViews.class).totals(null)).containsEntry(1L, 1L));
    }

    @Test
    void configuredIntervalSavesWithoutWaitingForShutdown() {
        Path file = directory.resolve("views.json");
        runner(file).withPropertyValues("poudy.product-views.save-interval=PT0.02S").run(context -> {
            context.getBean(ProductViews.class).increaseViewCount(1L);
            await().atMost(Duration.ofSeconds(5)).untilAsserted(
                () -> assertThat(new ProductViewFileRepository(file).load().dailyCounts()).hasSize(1)
            );
        });
    }

    @Test
    void corruptFilePreventsStartupAndRemainsUntouched() throws Exception {
        Path file = directory.resolve("views.json");
        Files.writeString(file, "broken");
        runner(file).run(context -> assertThat(context).hasFailed());
        assertThat(Files.readString(file)).isEqualTo("broken");
    }

    private ApplicationContextRunner runner(Path file) {
        return new ApplicationContextRunner().withUserConfiguration(ProductViewConfig.class)
            .withPropertyValues("poudy.product-views.file=" + file.toString().replace('\\', '/'));
    }
}

package com.poudy;

import com.poudy.feedback.service.FeedbackImageUploadService;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT, properties = {
        "server.forward-headers-strategy=native",
        "spring.servlet.multipart.max-file-size=1KB",
        "spring.servlet.multipart.max-request-size=2KB"
})
@MockitoBean(types = FeedbackImageUploadService.class)
public @interface EmbeddedServerTest {
}

package com.poudy;

import com.poudy.feedback.service.FeedbackService;
import com.poudy.productrequest.service.ProductRequestService;
import com.poudy.security.auth.app.ProviderTokenVerifiers;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@MockitoBean(types = {FeedbackService.class, ProductRequestService.class, ProviderTokenVerifiers.class})
public @interface SharedMockBeans {
}

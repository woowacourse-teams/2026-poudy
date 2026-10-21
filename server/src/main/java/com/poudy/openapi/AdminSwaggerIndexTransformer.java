package com.poudy.openapi;

import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.springdoc.core.properties.SwaggerUiConfigProperties;
import org.springdoc.core.properties.SwaggerUiOAuthProperties;
import org.springdoc.core.providers.ObjectMapperProvider;
import org.springdoc.webmvc.ui.SwaggerIndexPageTransformer;
import org.springdoc.webmvc.ui.SwaggerWelcomeCommon;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.resource.ResourceTransformerChain;
import org.springframework.web.servlet.resource.TransformedResource;

@Component
@Profile("prod")
public class AdminSwaggerIndexTransformer extends SwaggerIndexPageTransformer {

    private final String sessionPanel;

    public AdminSwaggerIndexTransformer(
        SwaggerUiConfigProperties config,
        SwaggerUiOAuthProperties oauth,
        SwaggerWelcomeCommon welcome,
        ObjectMapperProvider mapper
    ) throws IOException {
        super(config, oauth, welcome, mapper);
        sessionPanel = new ClassPathResource("openapi/session-panel.html").getContentAsString(StandardCharsets.UTF_8);
    }

    @Override
    public Resource transform(HttpServletRequest request, Resource resource, ResourceTransformerChain chain)
        throws IOException {
        Resource transformed = super.transform(request, resource, chain);
        if ("swagger-initializer.js".equals(resource.getFilename())) {
            String script = transformed.getContentAsString(StandardCharsets.UTF_8);
            String intercepted = script.replace("window.ui = SwaggerUIBundle({", """
                window.ui = SwaggerUIBundle({
                  responseInterceptor: (response) => {
                    window.dispatchEvent(new Event("poudy-session-changed"));
                    return response;
                  },
                """);
            return new TransformedResource(transformed, intercepted.getBytes(StandardCharsets.UTF_8));
        }
        if ("index.html".equals(resource.getFilename())) {
            String html = transformed.getContentAsString(StandardCharsets.UTF_8);
            return new TransformedResource(
                transformed,
                html.replace("<body>", "<body>" + sessionPanel).getBytes(StandardCharsets.UTF_8)
            );
        }
        return transformed;
    }
}

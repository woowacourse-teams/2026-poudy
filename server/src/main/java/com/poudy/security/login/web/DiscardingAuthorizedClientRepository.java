package com.poudy.security.login.web;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.jspecify.annotations.NonNull;
import org.jspecify.annotations.Nullable;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizedClientRepository;

public class DiscardingAuthorizedClientRepository implements OAuth2AuthorizedClientRepository {

    @Override
    public <T extends OAuth2AuthorizedClient> @Nullable T loadAuthorizedClient(
        @NonNull String clientRegistrationId,
        @NonNull Authentication principal,
        @NonNull HttpServletRequest request
    ) {
        return null;
    }

    @Override
    public void saveAuthorizedClient(
        @NonNull OAuth2AuthorizedClient authorizedClient,
        @NonNull Authentication principal,
        @NonNull HttpServletRequest request,
        @NonNull HttpServletResponse response
    ) {
    }

    @Override
    public void removeAuthorizedClient(
        @NonNull String clientRegistrationId,
        @NonNull Authentication principal,
        @NonNull HttpServletRequest request,
        @NonNull HttpServletResponse response
    ) {
    }
}

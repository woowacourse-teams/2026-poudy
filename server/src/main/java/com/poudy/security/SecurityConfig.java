package com.poudy.security;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.RuleViolationException;
import com.poudy.security.domain.EmailAlreadyRegisteredException;
import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.SocialSignIn;
import com.poudy.security.domain.SocialSignInResult;
import com.poudy.security.filter.ForeignOriginFilter;
import com.poudy.security.oauth.DiscardingAuthorizedClientRepository;
import com.poudy.security.oauth.RegisteredProviderRequestResolver;
import com.poudy.security.session.LoginSession;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.config.annotation.web.configurers.oauth2.client.OAuth2LoginConfigurer;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.web.authentication.logout.HttpStatusReturningLogoutSuccessHandler;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextHolderFilter;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.web.servlet.HandlerExceptionResolver;
import org.springframework.web.util.UriComponentsBuilder;

@Configuration
public class SecurityConfig {

    private static final String MEMBER_API = "/api/members/**";
    public static final String AUTHORIZATION_BASE_URI = "/api/oauth2/authorization";
    public static final String LOGOUT_URI = "/api/auth/logout";
    private static final String REDIRECTION_BASE_URI = "/api/login/oauth2/code/*";
    private static final String UNSERVED_LOGIN_PAGE = "/login";
    private static final String LOGIN_CALLBACK_PATH = "/login/callback";
    private static final String ERROR_PARAMETER = "error";
    private static final String PROVIDER_PARAMETER = "provider";
    private static final String WITHDRAWN_PARAMETER = "withdrawn";
    private static final String RESTORE_REQUESTED_PARAMETER = "restoreRequested";

    private static final Logger log = LoggerFactory.getLogger(SecurityConfig.class);

    @Bean
    public SecurityFilterChain securityFilterChain(
        HttpSecurity http,
        ClientOrigins clientOrigins,
        ClientRegistrationRepository clientRegistrationRepository,
        SecurityContextRepository securityContextRepository,
        AuthenticationSuccessHandler oauthLoginSuccessHandler,
        AuthenticationFailureHandler oauthLoginFailureHandler,
        LoginSession loginSession,
        @Qualifier("handlerExceptionResolver") HandlerExceptionResolver handlerExceptionResolver
    ) {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(clientOrigins.corsConfigurationSource()))
            .formLogin(AbstractHttpConfigurer::disable)
            .httpBasic(AbstractHttpConfigurer::disable)
            .logout(
                logout -> logout
                    .logoutRequestMatcher(PathPatternRequestMatcher.withDefaults().matcher(HttpMethod.POST, LOGOUT_URI))
                    .logoutSuccessHandler(new HttpStatusReturningLogoutSuccessHandler(HttpStatus.NO_CONTENT))
            )
            .requestCache(AbstractHttpConfigurer::disable)
            .headers(headers -> headers.cacheControl(HeadersConfigurer.CacheControlConfig::disable))
            .securityContext(context -> context.securityContextRepository(securityContextRepository))
            .authorizeHttpRequests(
                requests -> requests
                    .requestMatchers(MEMBER_API).authenticated()
                    .anyRequest().permitAll()
            )
            .oauth2Login(
                login -> configureSocialLogin(
                    login,
                    clientRegistrationRepository,
                    oauthLoginSuccessHandler,
                    oauthLoginFailureHandler
                )
            )
            .exceptionHandling(
                exceptions -> exceptions.authenticationEntryPoint(
                    (request, response, exception) -> handlerExceptionResolver.resolveException(
                        request,
                        response,
                        null,
                        exception
                    )
                )
            )
            .addFilterBefore(
                new ForeignOriginFilter(clientOrigins, handlerExceptionResolver),
                SecurityContextHolderFilter.class
            )
            .addFilterBefore(
                (request, response, chain) -> {
                    loginSession.expireIfOverdue((HttpServletRequest) request);
                    chain.doFilter(request, response);
                },
                SecurityContextHolderFilter.class
            );
        return http.build();
    }

    @Bean
    public AuthenticationSuccessHandler oauthLoginSuccessHandler(
        SocialSignIn socialSignIn,
        LoginSession loginSession,
        ClientOrigins clientOrigins
    ) {
        String loginCallback = clientOrigins.clientUrl(LOGIN_CALLBACK_PATH);
        return (request, response, authentication) -> completeSocialLogin(
            (OAuth2AuthenticationToken) authentication,
            socialSignIn,
            loginSession,
            loginCallback,
            request,
            response
        );
    }

    @Bean
    public AuthenticationFailureHandler oauthLoginFailureHandler(ClientOrigins clientOrigins) {
        String loginCallback = clientOrigins.clientUrl(LOGIN_CALLBACK_PATH);
        return (request, response, exception) -> {
            log.info("Social login failed: {}", exception.getMessage());
            response.sendRedirect(loginFailureUri(loginCallback, ErrorCode.OAUTH_LOGIN_FAILED).toUriString());
        };
    }

    @Bean
    public ClientOrigins clientOrigins(@Value("${poudy.cors.allowed-origins:}") List<String> configuredOrigins) {
        return ClientOrigins.from(configuredOrigins);
    }

    @Bean
    public SecurityContextRepository securityContextRepository() {
        return new HttpSessionSecurityContextRepository();
    }

    private void configureSocialLogin(
        OAuth2LoginConfigurer<HttpSecurity> login,
        ClientRegistrationRepository clientRegistrationRepository,
        AuthenticationSuccessHandler successHandler,
        AuthenticationFailureHandler failureHandler
    ) {
        login
            .loginPage(UNSERVED_LOGIN_PAGE)
            .authorizationEndpoint(
                endpoint -> endpoint
                    .baseUri(AUTHORIZATION_BASE_URI)
                    .authorizationRequestResolver(
                        new RegisteredProviderRequestResolver(clientRegistrationRepository, AUTHORIZATION_BASE_URI)
                    )
            )
            .redirectionEndpoint(endpoint -> endpoint.baseUri(REDIRECTION_BASE_URI))
            .authorizedClientRepository(new DiscardingAuthorizedClientRepository())
            .successHandler(successHandler)
            .failureHandler(failureHandler);
    }

    private void completeSocialLogin(
        OAuth2AuthenticationToken token,
        SocialSignIn socialSignIn,
        LoginSession loginSession,
        String loginCallback,
        HttpServletRequest request,
        HttpServletResponse response
    )
        throws IOException {
        try {
            OAuthAccount account = OAuthAccount.from(
                token.getAuthorizedClientRegistrationId(),
                token.getPrincipal().getAttributes()
            );
            SocialSignInResult result = socialSignIn.signIn(account);
            if (result.isRestoreRequested()) {
                loginSession.signOut(request, response);
                response.sendRedirect(
                    UriComponentsBuilder.fromUriString(loginCallback)
                        .queryParam(WITHDRAWN_PARAMETER, true)
                        .queryParam(RESTORE_REQUESTED_PARAMETER, true)
                        .toUriString()
                );
                return;
            }
            if (result.isWithdrawn()) {
                loginSession.holdWithdrawnMember(result.memberId(), request, response);
                response.sendRedirect(
                    UriComponentsBuilder.fromUriString(loginCallback)
                        .queryParam(WITHDRAWN_PARAMETER, true)
                        .toUriString()
                );
                return;
            }
            loginSession.signIn(result.memberId(), request, response);
            response.sendRedirect(loginCallback);
        } catch (RuntimeException exception) {
            rejectSocialLogin(loginSession, request, response, loginFailureUriOf(loginCallback, exception));
        }
    }

    private String loginFailureUriOf(String loginCallback, RuntimeException exception) {
        if (exception instanceof EmailAlreadyRegisteredException alreadyRegistered) {
            return loginFailureUri(loginCallback, alreadyRegistered.code())
                .queryParam(PROVIDER_PARAMETER, alreadyRegistered.registeredProvider().name())
                .toUriString();
        }
        if (exception instanceof RuleViolationException ruleViolation) {
            return loginFailureUri(loginCallback, ruleViolation.code()).toUriString();
        }
        log.error("Social login could not be completed", exception);
        return loginFailureUri(loginCallback, ErrorCode.OAUTH_LOGIN_FAILED).toUriString();
    }

    private UriComponentsBuilder loginFailureUri(String loginCallback, ErrorCode code) {
        return UriComponentsBuilder.fromUriString(loginCallback).queryParam(ERROR_PARAMETER, code.name());
    }

    private void rejectSocialLogin(
        LoginSession loginSession,
        HttpServletRequest request,
        HttpServletResponse response,
        String loginFailureUri
    )
        throws IOException {
        loginSession.signOut(request, response);
        response.sendRedirect(loginFailureUri);
    }

}

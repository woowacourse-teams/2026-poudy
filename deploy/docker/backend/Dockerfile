FROM amazoncorretto:21-al2023-headless AS webp-native

# webp-imageio extracts its JNI library into java.io.tmpdir and loads it from there.
# The container mounts /tmp noexec, so System.load fails with "failed to map segment".
# Extract the library at build time into a read-only path instead; the loader falls back
# to java.library.path when the /tmp copy cannot be loaded.
RUN dnf install -y unzip \
    && dnf clean all \
    && rm -rf /var/cache/dnf

COPY app.jar /build/app.jar

RUN set -eu; \
    arch="$(uname -m)"; \
    cd /build; \
    webp_jar="$(unzip -Z1 app.jar 'BOOT-INF/lib/webp-imageio-*.jar')"; \
    test "$(printf '%s\n' "${webp_jar}" | wc -l)" -eq 1; \
    unzip -q app.jar "${webp_jar}"; \
    mkdir -p /native; \
    unzip -j "${webp_jar}" "native/Linux/${arch}/libwebp-imageio.so" -d /native; \
    test -s /native/libwebp-imageio.so

FROM amazoncorretto:21-al2023-headless

WORKDIR /app

# The host JAR currently shells out to prlimit and heif-convert for bounded HEIC decoding.
# prlimit ships in util-linux, not util-linux-core, on Amazon Linux 2023.
RUN dnf install -y libheif-tools libde265 util-linux \
    && dnf clean all \
    && rm -rf /var/cache/dnf \
    && test -x /usr/bin/prlimit \
    && test -x /usr/bin/heif-convert

COPY --from=webp-native /native/libwebp-imageio.so /opt/poudy/native/libwebp-imageio.so
COPY --chown=10001:10001 app.jar /app/app.jar

ENV SPRING_PROFILES_ACTIVE=prod \
    SERVER_PORT=8080

EXPOSE 8080
USER 10001:10001

ENTRYPOINT ["java", "-Xms128m", "-Xmx768m", "-Djava.library.path=/opt/poudy/native", "-jar", "/app/app.jar"]

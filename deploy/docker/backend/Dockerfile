FROM amazoncorretto:21-al2023-headless

WORKDIR /app

# The host JAR currently shells out to prlimit and heif-convert for bounded HEIC decoding.
RUN dnf install -y libheif-tools libde265 util-linux-core \
    && dnf clean all \
    && rm -rf /var/cache/dnf

COPY --chown=10001:10001 app.jar /app/app.jar
COPY --chown=10001:10001 application-prod.yml /app/config/application-prod.yml

ENV SPRING_PROFILES_ACTIVE=prod \
    SERVER_PORT=8080

EXPOSE 8080
USER 10001:10001

ENTRYPOINT ["java", "-Xms128m", "-Xmx768m", "-jar", "/app/app.jar"]

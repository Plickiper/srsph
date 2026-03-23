FROM eclipse-temurin:17-jre

LABEL maintainer="design.kurtjoseph@gmail.com"

WORKDIR /opt/app

EXPOSE 8080

COPY target/backend-1.0.0.jar /opt/app/backend.jar

ENTRYPOINT ["java", "-jar", "backend.jar"]



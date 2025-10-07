package com.pecenio.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication(scanBasePackages = "com.pecenio")
@EnableJpaRepositories(basePackages = "com.pecenio.datamodel.repository")
@EntityScan(basePackages = {"com.pecenio.datamodel.entity", "com.pecenio.businessmodel.entity"})
public class SunRacingSpiritApplication {

    public static void main(String[] args) {
        SpringApplication.run(SunRacingSpiritApplication.class, args);
    }
}

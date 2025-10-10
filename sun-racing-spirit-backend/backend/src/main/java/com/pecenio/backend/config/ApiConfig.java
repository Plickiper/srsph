package com.pecenio.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ApiConfig {
    
    @Value("${app.api.base-url:http://localhost:8080}")
    private String baseUrl;
    
    @Value("${app.api.cors.allowed-origins:http://localhost:4200,http://localhost:4201}")
    private String allowedOrigins;
    
    public String getBaseUrl() {
        return baseUrl;
    }
    
    public String[] getAllowedOrigins() {
        return allowedOrigins.split(",");
    }
}

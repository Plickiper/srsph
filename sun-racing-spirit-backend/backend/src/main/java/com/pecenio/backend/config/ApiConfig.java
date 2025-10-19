package com.pecenio.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ApiConfig {
    
    @Value("${app.api.base-url}")
    private String baseUrl;
    
    @Value("${app.api.cors.allowed-origins}")
    private String allowedOrigins;
    
    public String getBaseUrl() {
        return baseUrl;
    }
    
    public String[] getAllowedOrigins() {
        return allowedOrigins.split(",");
    }
}

package com.pecenio.backend.interceptor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class RequestLoggingInterceptor implements HandlerInterceptor {

    private static final Logger logger = LoggerFactory.getLogger(RequestLoggingInterceptor.class);

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        logger.info("🌐 {} {} - {}", request.getMethod(), request.getRequestURI(), request.getRemoteAddr());
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        // Only log errors, not successful completions
        if (ex != null) {
            // Check if it's a client disconnection - don't log as error
            if (ex instanceof org.apache.catalina.connector.ClientAbortException || 
                (ex instanceof java.io.IOException && ex.getMessage() != null && 
                 ex.getMessage().contains("Connection reset by peer"))) {
                logger.debug("🔌 Client disconnected: {}", ex.getMessage());
            } else {
                logger.error("❌ Exception occurred: {}", ex.getMessage());
            }
        }
    }

    private String getStatusText(int status) {
        switch (status) {
            case 200: return "OK";
            case 201: return "Created";
            case 400: return "Bad Request";
            case 401: return "Unauthorized";
            case 403: return "Forbidden";
            case 404: return "Not Found";
            case 500: return "Internal Server Error";
            default: return "Unknown";
        }
    }
}

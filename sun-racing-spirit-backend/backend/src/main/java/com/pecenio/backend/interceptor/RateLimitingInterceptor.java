package com.pecenio.backend.interceptor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.time.LocalDateTime;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Component
public class RateLimitingInterceptor implements HandlerInterceptor {
    
    private final ConcurrentMap<String, RateLimitInfo> rateLimitMap = new ConcurrentHashMap<>();
    
    @Value("${app.rate-limiting.enabled:true}")
    private boolean rateLimitingEnabled;
    
    @Value("${app.rate-limiting.max-attempts:20}")
    private int maxAttempts;
    
    @Value("${app.rate-limiting.window-minutes:5}")
    private int windowSizeMinutes;
    
    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        // Skip rate limiting if disabled
        if (!rateLimitingEnabled) {
            return true;
        }
        
        String clientIp = getClientIpAddress(request);
        String endpoint = request.getRequestURI();
        String key = clientIp + ":" + endpoint;
        
        RateLimitInfo rateLimitInfo = rateLimitMap.computeIfAbsent(key, k -> new RateLimitInfo());
        
        LocalDateTime now = LocalDateTime.now();
        
        // Reset if window has expired
        if (rateLimitInfo.getWindowStart().plusMinutes(windowSizeMinutes).isBefore(now)) {
            rateLimitInfo.reset(now);
        }
        
        // Check if limit exceeded
        if (rateLimitInfo.getAttempts() >= maxAttempts) {
            response.setStatus(429); // TOO_MANY_REQUESTS
            response.setContentType("application/json");
            response.getWriter().write("{\"success\":false,\"error\":\"Too many requests. Please try again later.\",\"retryAfter\":" + 
                windowSizeMinutes * 60 + "}");
            return false;
        }
        
        // Increment attempts
        rateLimitInfo.incrementAttempts();
        
        return true;
    }
    
    // Method to clear rate limits for development (can be called via debug endpoint)
    public void clearRateLimits() {
        rateLimitMap.clear();
    }
    
    // Method to clear rate limits for specific IP
    public void clearRateLimitsForIp(String ip) {
        rateLimitMap.entrySet().removeIf(entry -> entry.getKey().startsWith(ip + ":"));
    }
    
    private String getClientIpAddress(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp;
        }
        return request.getRemoteAddr();
    }
    
    private static class RateLimitInfo {
        private int attempts = 0;
        private LocalDateTime windowStart = LocalDateTime.now();
        
        public int getAttempts() {
            return attempts;
        }
        
        public void incrementAttempts() {
            this.attempts++;
        }
        
        public LocalDateTime getWindowStart() {
            return windowStart;
        }
        
        public void reset(LocalDateTime now) {
            this.attempts = 0;
            this.windowStart = now;
        }
    }
}

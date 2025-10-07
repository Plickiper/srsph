package com.pecenio.backend.service;

import com.pecenio.businessmodel.entity.AuditLog;
import com.pecenio.datamodel.repository.AuditLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class AuditLogService {
    
    @Autowired
    private AuditLogRepository auditLogRepository;
    
    // Log an action
    public void logAction(Long userId, String userName, String userEmail, String action,
                        String resourceType, Long resourceId, String resourceName,
                        String description, String ipAddress, String userAgent,
                        AuditLog.ActionType actionType, AuditLog.Severity severity) {
        
        AuditLog auditLog = new AuditLog(userId, userName, userEmail, action, resourceType,
                                       resourceId, resourceName, description, ipAddress,
                                       userAgent, actionType, severity);
        
        auditLogRepository.save(auditLog);
    }
    
    // Get all audit logs with pagination
    public Page<AuditLog> getAllLogs(int page, int size, String sortBy, String sortDir) {
        Sort sort = sortDir.equalsIgnoreCase("desc") ? 
                   Sort.by(sortBy).descending() : 
                   Sort.by(sortBy).ascending();
        
        Pageable pageable = PageRequest.of(page, size, sort);
        return auditLogRepository.findAll(pageable);
    }
    
    // Get logs by user
    public Page<AuditLog> getLogsByUser(Long userId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return auditLogRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
    }
    
    // Get logs by action type
    public Page<AuditLog> getLogsByActionType(AuditLog.ActionType actionType, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return auditLogRepository.findByActionTypeOrderByCreatedAtDesc(actionType, pageable);
    }
    
    // Get logs by severity
    public Page<AuditLog> getLogsBySeverity(AuditLog.Severity severity, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return auditLogRepository.findBySeverityOrderByCreatedAtDesc(severity, pageable);
    }
    
    // Get logs by resource type
    public Page<AuditLog> getLogsByResourceType(String resourceType, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return auditLogRepository.findByResourceTypeOrderByCreatedAtDesc(resourceType, pageable);
    }
    
    // Get logs by date range
    public Page<AuditLog> getLogsByDateRange(LocalDateTime startDate, LocalDateTime endDate, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return auditLogRepository.findByDateRange(startDate, endDate, pageable);
    }
    
    // Get logs by user and date range
    public Page<AuditLog> getLogsByUserAndDateRange(Long userId, LocalDateTime startDate, LocalDateTime endDate, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return auditLogRepository.findByUserAndDateRange(userId, startDate, endDate, pageable);
    }
    
    // Get recent activity
    public List<AuditLog> getRecentActivity(int limit) {
        Pageable pageable = PageRequest.of(0, limit, Sort.by("createdAt").descending());
        return auditLogRepository.findRecentActivity(pageable);
    }
    
    // Get critical logs
    public List<AuditLog> getCriticalLogs(int limit) {
        Pageable pageable = PageRequest.of(0, limit, Sort.by("createdAt").descending());
        return auditLogRepository.findCriticalLogs(pageable);
    }
    
    // Get audit statistics
    public Map<String, Object> getAuditStatistics() {
        Map<String, Long> severityCounts = auditLogRepository.countBySeverity()
                .stream()
                .collect(Collectors.toMap(
                    result -> result[0].toString(),
                    result -> (Long) result[1]
                ));
        
        Map<String, Long> actionTypeCounts = auditLogRepository.countByActionType()
                .stream()
                .collect(Collectors.toMap(
                    result -> result[0].toString(),
                    result -> (Long) result[1]
                ));
        
        long totalLogs = auditLogRepository.count();
        long criticalLogs = severityCounts.getOrDefault("CRITICAL", 0L);
        long highSeverityLogs = severityCounts.getOrDefault("HIGH", 0L);
        
        return Map.of(
            "totalLogs", totalLogs,
            "criticalLogs", criticalLogs,
            "highSeverityLogs", highSeverityLogs,
            "severityCounts", severityCounts,
            "actionTypeCounts", actionTypeCounts
        );
    }
    
    // Search logs
    public Page<AuditLog> searchLogs(String searchTerm, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return auditLogRepository.findAll(pageable);
    }
}

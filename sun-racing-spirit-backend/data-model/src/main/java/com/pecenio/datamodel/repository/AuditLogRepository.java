package com.pecenio.datamodel.repository;

import com.pecenio.businessmodel.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    
    // Find logs by user ID
    Page<AuditLog> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
    
    // Find logs by action type
    Page<AuditLog> findByActionTypeOrderByCreatedAtDesc(AuditLog.ActionType actionType, Pageable pageable);
    
    // Find logs by severity
    Page<AuditLog> findBySeverityOrderByCreatedAtDesc(AuditLog.Severity severity, Pageable pageable);
    
    // Find logs by resource type
    Page<AuditLog> findByResourceTypeOrderByCreatedAtDesc(String resourceType, Pageable pageable);
    
    // Find logs by date range
    @Query("SELECT a FROM AuditLog a WHERE a.createdAt BETWEEN :startDate AND :endDate ORDER BY a.createdAt DESC")
    Page<AuditLog> findByDateRange(@Param("startDate") LocalDateTime startDate, 
                                  @Param("endDate") LocalDateTime endDate, 
                                  Pageable pageable);
    
    // Find logs by user and date range
    @Query("SELECT a FROM AuditLog a WHERE a.userId = :userId AND a.createdAt BETWEEN :startDate AND :endDate ORDER BY a.createdAt DESC")
    Page<AuditLog> findByUserAndDateRange(@Param("userId") Long userId,
                                        @Param("startDate") LocalDateTime startDate,
                                        @Param("endDate") LocalDateTime endDate,
                                        Pageable pageable);
    
    // Find logs by action and resource type
    @Query("SELECT a FROM AuditLog a WHERE a.action = :action AND a.resourceType = :resourceType ORDER BY a.createdAt DESC")
    Page<AuditLog> findByActionAndResourceType(@Param("action") String action,
                                             @Param("resourceType") String resourceType,
                                             Pageable pageable);
    
    // Get recent activity for dashboard
    @Query("SELECT a FROM AuditLog a ORDER BY a.createdAt DESC")
    List<AuditLog> findRecentActivity(Pageable pageable);
    
    // Count logs by severity
    @Query("SELECT a.severity, COUNT(a) FROM AuditLog a GROUP BY a.severity")
    List<Object[]> countBySeverity();
    
    // Count logs by action type
    @Query("SELECT a.actionType, COUNT(a) FROM AuditLog a GROUP BY a.actionType")
    List<Object[]> countByActionType();
    
    // Find critical logs
    @Query("SELECT a FROM AuditLog a WHERE a.severity = 'CRITICAL' ORDER BY a.createdAt DESC")
    List<AuditLog> findCriticalLogs(Pageable pageable);
}

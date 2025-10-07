package com.pecenio.backend.controller;

import com.pecenio.backend.service.AuditLogService;
import com.pecenio.businessmodel.entity.AuditLog;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/audit-logs")
public class AuditLogController {

    @Autowired
    private AuditLogService auditLogService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAuditLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt,desc") String sort) {

        
        try {
            // Fix the sort parameter - use 'createdAt' instead of 'timestamp'
            String sortField = sort.split(",")[0];
            if (sortField.equals("timestamp")) {
                sortField = "createdAt";
            }
            
            String sortDirection = sort.contains("desc") ? "desc" : "asc";
            
            Page<AuditLog> auditLogPage = auditLogService.getAllLogs(page, size, sortField, sortDirection);

            // Convert AuditLog entities to frontend-compatible format
            List<Map<String, Object>> formattedLogs = auditLogPage.getContent().stream()
                .map(log -> {
                    Map<String, Object> formattedLog = new HashMap<>();
                    formattedLog.put("id", log.getId());
                    formattedLog.put("timestamp", log.getCreatedAt().toString()); // Convert createdAt to timestamp
                    formattedLog.put("actorId", log.getUserId());
                    formattedLog.put("actorName", log.getUserName()); // Convert userName to actorName
                    formattedLog.put("actorEmail", log.getUserEmail()); // Convert userEmail to actorEmail
                    formattedLog.put("action", log.getAction());
                    formattedLog.put("resourceType", log.getResourceType());
                    formattedLog.put("resourceId", log.getResourceId());
                    formattedLog.put("resourceName", log.getResourceName());
                    formattedLog.put("description", log.getDescription());
                    formattedLog.put("ipAddress", log.getIpAddress());
                    formattedLog.put("userAgent", log.getUserAgent());
                    formattedLog.put("actionType", log.getActionType().toString());
                    formattedLog.put("severity", log.getSeverity().toString());
                    return formattedLog;
                })
                .collect(java.util.stream.Collectors.toList());

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("auditLogs", formattedLogs);
            response.put("currentPage", auditLogPage.getNumber());
            response.put("totalItems", auditLogPage.getTotalElements());
            response.put("totalPages", auditLogPage.getTotalPages());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("Failed to retrieve audit logs: " + e.getMessage()));
        }
    }


    private Map<String, Object> createErrorResponse(String message) {
        Map<String, Object> errorResponse = new HashMap<>();
        errorResponse.put("success", false);
        errorResponse.put("error", message);
        return errorResponse;
    }
}
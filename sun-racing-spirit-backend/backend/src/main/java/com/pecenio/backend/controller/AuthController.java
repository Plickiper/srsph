package com.pecenio.backend.controller;

import com.pecenio.backend.service.UserService;
import com.pecenio.backend.service.AuditLogService;
import com.pecenio.backend.service.JwtService;
import com.pecenio.backend.service.PasswordService;
import com.pecenio.backend.util.JwtAuthUtil;
import com.pecenio.businessmodel.entity.User;
import com.pecenio.businessmodel.entity.AuditLog;
import com.pecenio.datamodel.entity.UserEntity;
import com.pecenio.datamodel.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.annotation.CrossOrigin;

import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = {"http://localhost:4200", "http://localhost:4201", "http://localhost:53515", "http://localhost:51316"})
public class AuthController {

    @Autowired
    private UserService userService;
    
    @Autowired
    private AuditLogService auditLogService;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private JwtService jwtService;
    
    @Autowired
    private JwtAuthUtil jwtAuthUtil;
    
    @Autowired
    private PasswordService passwordService;


    @PostMapping("/admin/login")
    public ResponseEntity<Map<String, Object>> adminLogin(
            @RequestBody Map<String, String> loginRequest,
            HttpServletRequest request) {
        String usernameOrEmail = loginRequest.get("usernameOrEmail");
        String password = loginRequest.get("password");
        try {
            User user = userService.login(usernameOrEmail, password);
            
            // Check if user has admin privileges (STAFF or SUPER_ADMIN)
            if (!isAdminRole(user.getRole())) {
                // Log failed login attempt
                try {
                    auditLogService.logAction(
                        null, "Unknown", "Unknown", "LOGIN_ATTEMPT",
                        "USER", null, usernameOrEmail,
                        "Failed login attempt - insufficient privileges",
                        getClientIpAddress(request), request.getHeader("User-Agent"),
                        AuditLog.ActionType.LOGIN, AuditLog.Severity.MEDIUM
                    );
                } catch (Exception auditException) {
                    // Audit logging failed, but continue with login
                }
                
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(createErrorResponse("Access denied. Admin privileges required. Please contact your Super Admin for account access."));
            }
            
            // Check if user account is active
            if (!user.getIsActive()) {
                // Log failed login attempt for inactive account
                try {
                    auditLogService.logAction(
                        user.getId(), user.getFirstName() + " " + user.getLastName(), user.getEmail(),
                        "LOGIN_ATTEMPT", "USER", user.getId(), user.getUsername(),
                        "Failed login attempt - account is inactive",
                        getClientIpAddress(request), request.getHeader("User-Agent"),
                        AuditLog.ActionType.LOGIN, AuditLog.Severity.HIGH
                    );
                } catch (Exception auditException) {
                    // Audit logging failed, but continue with login
                }
                
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(createErrorResponse("Account is inactive. Please contact administrator."));
            }
            
            // Log successful login
            try {
                auditLogService.logAction(
                    user.getId(), user.getFirstName() + " " + user.getLastName(), user.getEmail(),
                    "LOGIN_SUCCESS", "USER", user.getId(), user.getUsername(),
                    "Admin login successful",
                    getClientIpAddress(request), request.getHeader("User-Agent"),
                    AuditLog.ActionType.LOGIN, AuditLog.Severity.LOW
                );
                } catch (Exception auditException) {
                    // Audit logging failed, but continue with login
                }
            
            // Generate JWT token
            String token = jwtService.generateToken(user.getUsername(), user.getRole(), user.getId());
            
            // Create response with user info, permissions, and token
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Login successful");
            response.put("token", token);
            response.put("user", Map.of(
                "id", user.getId(),
                "username", user.getUsername(),
                "email", user.getEmail(),
                "role", user.getRole(),
                "firstName", user.getFirstName() != null ? user.getFirstName() : "",
                "lastName", user.getLastName() != null ? user.getLastName() : ""
            ));
            response.put("permissions", getPermissions(user.getRole()));
            
            return ResponseEntity.ok(response);
            
        } catch (RuntimeException e) {
            // Log failed login attempt (with error handling to prevent 500 errors)
            try {
                auditLogService.logAction(
                    null, "Unknown", "Unknown", "LOGIN_FAILED",
                    "USER", null, usernameOrEmail,
                    "Failed login attempt - invalid credentials",
                    getClientIpAddress(request), request.getHeader("User-Agent"),
                    AuditLog.ActionType.LOGIN, AuditLog.Severity.MEDIUM
                );
            } catch (Exception auditException) {
                // Continue with login error response even if audit logging fails
            }
            
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(createErrorResponse("Invalid username/email or password. Please check your credentials and try again."));
        }
    }
    
    @PostMapping("/admin/refresh-token")
    public ResponseEntity<Map<String, Object>> refreshToken(@RequestBody Map<String, String> request) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            String token = request.get("token");
            
            if (token == null || token.trim().isEmpty()) {
                response.put("success", false);
                response.put("message", "Token is required");
                return ResponseEntity.badRequest().body(response);
            }
            
            // Extract user info from token
            String username = jwtService.extractUsername(token);
            String role = jwtService.extractRole(token);
            Long userId = jwtService.extractUserId(token);
            
            // Validate current token
            if (jwtService.validateToken(token, username)) {
                // Generate new token with extended expiration
                String newToken = jwtService.generateToken(username, role, userId);
                
                response.put("success", true);
                response.put("message", "Token refreshed successfully");
                response.put("token", newToken);
                response.put("user", Map.of(
                    "id", userId,
                    "username", username,
                    "role", role
                ));
                response.put("permissions", getPermissions(role));
                
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "Invalid or expired token");
                return ResponseEntity.badRequest().body(response);
            }
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Token refresh failed");
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    @PostMapping("/admin/logout")
    public ResponseEntity<Map<String, Object>> adminLogout(HttpServletRequest request) {
        try {
            String token = jwtAuthUtil.extractTokenFromRequest(request);
            if (token == null || !jwtAuthUtil.isTokenValid(token)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(createErrorResponse("Invalid or missing authentication token"));
            }
            
            Long userId = jwtAuthUtil.getUserIdFromToken(token);
            
            // Log the logout action
            auditLogService.logAction(
                userId, "System", "system@sunracingspirit.com", "LOGOUT_SUCCESS",
                "USER", userId, "Admin User",
                "Admin logout successful",
                getClientIpAddress(request), request.getHeader("User-Agent"),
                AuditLog.ActionType.LOGOUT, AuditLog.Severity.LOW
            );
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Logged out successfully");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("Failed to logout: " + e.getMessage()));
        }
    }
    
    @PostMapping("/admin/create-staff")
    public ResponseEntity<Map<String, Object>> createStaff(
            @RequestBody CreateStaffRequest request,
            HttpServletRequest httpRequest) {
        
        try {
            String token = jwtAuthUtil.extractTokenFromRequest(httpRequest);
            if (token == null || !jwtAuthUtil.isTokenValid(token)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(createErrorResponse("Invalid or missing authentication token"));
            }
            
            String role = jwtAuthUtil.getRoleFromToken(token);
            // Only SUPER_ADMIN can create staff accounts
            if (!"SUPER_ADMIN".equals(role)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(createErrorResponse("Only Super Admin can create staff accounts"));
            }
            // Basic validation
            if (request.getUsername() == null || request.getUsername().trim().isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse("Username is required"));
            }
            if (request.getEmail() == null || request.getEmail().trim().isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse("Email is required"));
            }
            if (request.getPassword() == null || request.getPassword().length() < 6) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse("Password must be at least 6 characters"));
            }
            if (request.getFirstName() == null || request.getFirstName().trim().isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse("First name is required"));
            }
            if (request.getLastName() == null || request.getLastName().trim().isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse("Last name is required"));
            }

            User newStaff = new User();
            newStaff.setUsername(request.getUsername().trim());
            newStaff.setEmail(request.getEmail().trim());
            newStaff.setPassword(request.getPassword());
            newStaff.setFirstName(request.getFirstName().trim());
            newStaff.setLastName(request.getLastName().trim());
            newStaff.setPhoneNumber(request.getPhoneNumber() != null ? request.getPhoneNumber().trim() : null);
            newStaff.setRole("STAFF");
            newStaff.setIsActive(true);
            
            User createdUser = userService.createUser(newStaff);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("user", sanitizeUserForResponse(createdUser));
            response.put("message", "Staff account created successfully");
            
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
            
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(createErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("Authentication failed: " + e.getMessage()));
        }
    }


    @GetMapping("/admin/staff")
    public ResponseEntity<Map<String, Object>> getAllStaff(HttpServletRequest request) {
        try {
            String token = jwtAuthUtil.extractTokenFromRequest(request);
            if (token == null || !jwtAuthUtil.isTokenValid(token)) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(createErrorResponse("Invalid or missing authentication token"));
            }
            
            String role = jwtAuthUtil.getRoleFromToken(token);
            // Only SUPER_ADMIN can view all staff
            if (!"SUPER_ADMIN".equals(role)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(createErrorResponse("Only Super Admin can view staff list"));
            }
            var staffUsers = userService.getUsersByRole("STAFF");
            var superAdmins = userService.getUsersByRole("SUPER_ADMIN");
            
            // Combine and sanitize
            var allAdminUsers = new java.util.ArrayList<>(staffUsers);
            allAdminUsers.addAll(superAdmins);
            
            var sanitizedUsers = allAdminUsers.stream()
                .map(this::sanitizeUserForResponse)
                .toList();
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("users", sanitizedUsers);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("Failed to retrieve staff list: " + e.getMessage()));
        }
    }



    @PutMapping("/admin/staff/{id}/simple")
    public ResponseEntity<Map<String, Object>> simpleUpdateStaff(
            @PathVariable Long id,
            @RequestBody Map<String, Object> request,
            @RequestHeader("Admin-Role") String adminRole) {
        
        
        try {
            // Only SUPER_ADMIN can update staff accounts
            if (!"SUPER_ADMIN".equals(adminRole)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(createErrorResponse("Only Super Admin can update staff accounts"));
            }
            
            var user = userService.getUserById(id);
            if (user.isEmpty() || !isAdminRole(user.get().getRole())) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(createErrorResponse("Staff member not found"));
            }
            
            User existingUser = user.get();
            // Only update isActive if provided
            if (request.containsKey("isActive")) {
                Boolean isActive = (Boolean) request.get("isActive");
                existingUser.setIsActive(isActive);
            }
            User savedUser = userService.updateUser(id, existingUser);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("user", sanitizeUserForResponse(savedUser));
            response.put("message", "Staff account updated successfully");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("Error: " + e.getMessage()));
        }
    }

    @PutMapping("/admin/staff/{id}/deactivate")
    public ResponseEntity<Map<String, Object>> deactivateStaff(
            @PathVariable Long id,
            @RequestHeader("Admin-Role") String adminRole) {
        
        
        try {
            // Only SUPER_ADMIN can update staff accounts
            if (!"SUPER_ADMIN".equals(adminRole)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(createErrorResponse("Only Super Admin can update staff accounts"));
            }
            
            var user = userService.getUserById(id);
            if (user.isEmpty() || !isAdminRole(user.get().getRole())) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(createErrorResponse("Staff member not found"));
            }
            
            User existingUser = user.get();
            // Set isActive to false
            existingUser.setIsActive(false);
            
            User savedUser = userService.updateUser(id, existingUser);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("user", sanitizeUserForResponse(savedUser));
            response.put("message", "Staff account deactivated successfully");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("Error: " + e.getMessage()));
        }
    }

    @PutMapping("/admin/staff/{id}/deactivate-simple")
    public ResponseEntity<Map<String, Object>> deactivateStaffSimple(
            @PathVariable Long id,
            @RequestHeader("Admin-Role") String adminRole) {
        
        
        try {
            // Only SUPER_ADMIN can update staff accounts
            if (!"SUPER_ADMIN".equals(adminRole)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(createErrorResponse("Only Super Admin can update staff accounts"));
            }
            
            // Get the user entity directly from repository to avoid validation issues
            var userEntity = userRepository.findById(id);
            if (userEntity.isEmpty() || !isAdminRole(userEntity.get().getRole())) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(createErrorResponse("Staff member not found"));
            }
            
            UserEntity existingUser = userEntity.get();
            // Soft deactivate - set isActive to false
            existingUser.setIsActive(false);
            existingUser.setUpdatedAt(LocalDateTime.now());
            
            // Save directly to repository to bypass validation
            UserEntity savedUser = userRepository.save(existingUser);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("user", sanitizeUserForResponse(savedUser.toBusinessModel()));
            response.put("message", "Staff account deactivated successfully");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("Error: " + e.getMessage()));
        }
    }

    @DeleteMapping("/admin/staff/{id}/terminate")
    public ResponseEntity<Map<String, Object>> terminateStaff(
            @PathVariable Long id,
            @RequestHeader("Admin-Role") String adminRole) {
        
        
        try {
            // Only SUPER_ADMIN can terminate staff accounts
            if (!"SUPER_ADMIN".equals(adminRole)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(createErrorResponse("Only Super Admin can terminate staff accounts"));
            }
            
            // Check if user exists and is a staff member
            var userEntity = userRepository.findById(id);
            if (userEntity.isEmpty() || !isAdminRole(userEntity.get().getRole())) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(createErrorResponse("Staff member not found"));
            }
            
            // Permanently delete the user from database
            userRepository.deleteById(id);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Staff account terminated permanently");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("Error: " + e.getMessage()));
        }
    }


    @PutMapping("/admin/staff/{id}")
    public ResponseEntity<Map<String, Object>> updateStaff(
            @PathVariable Long id,
            @RequestBody UpdateStaffRequest request,
            @RequestHeader("Admin-Role") String adminRole) {
        
        
        // Validate request
        if (request == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(createErrorResponse("Request body is required"));
        }
        
        // Only SUPER_ADMIN can update staff accounts
        if (!"SUPER_ADMIN".equals(adminRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(createErrorResponse("Only Super Admin can update staff accounts"));
        }
        
        try {
            var user = userService.getUserById(id);
            if (user.isEmpty() || !isAdminRole(user.get().getRole())) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(createErrorResponse("Staff member not found"));
            }
            
            User existingUser = user.get();
            
            
            // Only update fields that are provided in the request
            if (request.getFirstName() != null) {
                existingUser.setFirstName(request.getFirstName());
            }
            if (request.getLastName() != null) {
                existingUser.setLastName(request.getLastName());
            }
            if (request.getUsername() != null) {
                // Check if username is being changed and if new username already exists
                if (!existingUser.getUsername().equals(request.getUsername())) {
                    if (userService.existsByUsername(request.getUsername())) {
                        return ResponseEntity.status(HttpStatus.CONFLICT)
                            .body(createErrorResponse("Username already exists: " + request.getUsername()));
                    }
                }
                existingUser.setUsername(request.getUsername());
            }
            if (request.getEmail() != null) {
                // Check if email is being changed and if new email already exists
                if (!existingUser.getEmail().equals(request.getEmail())) {
                    if (userService.existsByEmail(request.getEmail())) {
                        return ResponseEntity.status(HttpStatus.CONFLICT)
                            .body(createErrorResponse("Email already exists: " + request.getEmail()));
                    }
                }
                existingUser.setEmail(request.getEmail());
            }
            if (request.getPhoneNumber() != null) {
                existingUser.setPhoneNumber(request.getPhoneNumber());
            }
            if (request.getIsActive() != null) {
                existingUser.setIsActive(request.getIsActive());
            }
            
            // Handle password change if provided
            if (request.getNewPassword() != null && !request.getNewPassword().trim().isEmpty()) {
                // Validate new password using PasswordService requirements
                if (!passwordService.isValidPassword(request.getNewPassword())) {
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(createErrorResponse("New password " + passwordService.getPasswordRequirements()));
                }
                // Hash the new password
                String hashedPassword = passwordService.hashPassword(request.getNewPassword());
                existingUser.setPassword(hashedPassword);
            }
            
            User savedUser = userService.updateUser(id, existingUser);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("user", sanitizeUserForResponse(savedUser));
            response.put("message", "Staff account updated successfully");
            
            return ResponseEntity.ok(response);
            
        } catch (RuntimeException e) {
            
            // Check if it's a validation error
            if (e.getMessage() != null && e.getMessage().contains("Validation failed")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse("Validation error: " + e.getMessage()));
            }
            
            // Check if it's a unique constraint violation
            if (e.getMessage() != null && (e.getMessage().contains("Duplicate entry") || e.getMessage().contains("unique constraint"))) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(createErrorResponse("Username or email already exists"));
            }
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("Failed to update staff member: " + e.getMessage()));
        } catch (Exception e) {
            
            // Check if it's a JSON deserialization error
            if (e.getMessage() != null && (e.getMessage().contains("JSON") || e.getMessage().contains("deserialization") || e.getMessage().contains("parse"))) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse("Invalid request format: " + e.getMessage()));
            }
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(createErrorResponse("Unexpected error occurred: " + e.getMessage()));
        }
    }

    @DeleteMapping("/admin/staff/{id}")
    public ResponseEntity<Map<String, Object>> deleteStaff(
            @PathVariable Long id,
            @RequestHeader("Admin-Role") String adminRole) {
        
        // Only SUPER_ADMIN can delete staff accounts
        if (!"SUPER_ADMIN".equals(adminRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(createErrorResponse("Only Super Admin can delete staff accounts"));
        }
        
        try {
            var user = userService.getUserById(id);
            if (user.isEmpty() || !isAdminRole(user.get().getRole())) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(createErrorResponse("Staff member not found"));
            }
            
            // Don't allow deleting the last SUPER_ADMIN
            if ("SUPER_ADMIN".equals(user.get().getRole())) {
                var superAdmins = userService.getUsersByRole("SUPER_ADMIN");
                if (superAdmins.size() <= 1) {
                    return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(createErrorResponse("Cannot delete the last Super Admin"));
                }
            }
            
            userService.deleteUser(id);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Staff account deleted successfully");
            
            return ResponseEntity.ok(response);
            
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(createErrorResponse(e.getMessage()));
        }
    }

    // Helper methods
    private boolean isAdminRole(String role) {
        return "STAFF".equals(role) || "SUPER_ADMIN".equals(role);
    }

    private Map<String, Object> getPermissions(String role) {
        Map<String, Object> permissions = new HashMap<>();
        
        if ("SUPER_ADMIN".equals(role)) {
            permissions.put("canManageProducts", true);
            permissions.put("canViewOrders", true);
            permissions.put("canManageUsers", true);
            permissions.put("canCreateStaff", true);
            permissions.put("canViewDashboard", true);
        } else if ("STAFF".equals(role)) {
            permissions.put("canManageProducts", true);
            permissions.put("canViewOrders", true);
            permissions.put("canManageUsers", false);
            permissions.put("canCreateStaff", false);
            permissions.put("canViewDashboard", true);
        }
        
        return permissions;
    }

    private Map<String, Object> sanitizeUserForResponse(User user) {
        Map<String, Object> sanitized = new HashMap<>();
        sanitized.put("id", user.getId());
        sanitized.put("username", user.getUsername());
        sanitized.put("email", user.getEmail());
        sanitized.put("firstName", user.getFirstName());
        sanitized.put("lastName", user.getLastName());
        sanitized.put("phoneNumber", user.getPhoneNumber());
        sanitized.put("role", user.getRole());
        sanitized.put("isActive", user.getIsActive());
        sanitized.put("lastLoginAt", user.getLastLoginAt());
        sanitized.put("createdAt", user.getCreatedAt());
        // Note: password is excluded for security
        return sanitized;
    }

    private Map<String, Object> createErrorResponse(String message) {
        Map<String, Object> error = new HashMap<>();
        error.put("success", false);
        error.put("error", message);
        return error;
    }

    // Request DTOs
    public static class CreateStaffRequest {
        private String username;
        private String email;
        private String password;
        private String firstName;
        private String lastName;
        private String phoneNumber;

        // Getters and setters
        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
        public String getFirstName() { return firstName; }
        public void setFirstName(String firstName) { this.firstName = firstName; }
        public String getLastName() { return lastName; }
        public void setLastName(String lastName) { this.lastName = lastName; }
        public String getPhoneNumber() { return phoneNumber; }
        public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }
    }

    public static class UpdateStaffRequest {
        private String firstName;
        private String lastName;
        private String username;
        private String email;
        private String phoneNumber;
        private Boolean isActive;
        private String newPassword;

        // Default constructor for Jackson
        public UpdateStaffRequest() {}

        // Getters and setters
        public String getFirstName() { return firstName; }
        public void setFirstName(String firstName) { this.firstName = firstName; }
        public String getLastName() { return lastName; }
        public void setLastName(String lastName) { this.lastName = lastName; }
        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getPhoneNumber() { return phoneNumber; }
        public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }
        public Boolean getIsActive() { return isActive; }
        public void setIsActive(Boolean isActive) { this.isActive = isActive; }
        public String getNewPassword() { return newPassword; }
        public void setNewPassword(String newPassword) { this.newPassword = newPassword; }
        
        @Override
        public String toString() {
            return "UpdateStaffRequest{" +
                    "firstName='" + firstName + '\'' +
                    ", lastName='" + lastName + '\'' +
                    ", username='" + username + '\'' +
                    ", email='" + email + '\'' +
                    ", phoneNumber='" + phoneNumber + '\'' +
                    ", isActive=" + isActive +
                    ", newPassword=" + (newPassword != null ? "[PROVIDED]" : "null") +
                    '}';
        }
    }
    
    
    // Helper method to get client IP address
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
}
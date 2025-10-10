package com.pecenio.backend.controller;

import com.pecenio.backend.service.UserService;
import com.pecenio.backend.util.ApiResponseUtil;
import com.pecenio.businessmodel.entity.User;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserService userService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllUsers() {
        try {
            List<User> users = userService.getAllUsers();
            Map<String, Object> data = new HashMap<>();
            data.put("users", users);
            data.put("total", users.size());
            return ApiResponseUtil.success(data, "Users retrieved successfully");
        } catch (Exception e) {
            return ApiResponseUtil.internalError("Failed to retrieve users: " + e.getMessage());
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getUserById(@PathVariable Long id) {
        try {
            Optional<User> user = userService.getUserById(id);
            if (user.isPresent()) {
                return ApiResponseUtil.success(user.get(), "User retrieved successfully");
            }
            return ApiResponseUtil.notFound("User not found");
        } catch (Exception e) {
            return ApiResponseUtil.internalError("Failed to retrieve user: " + e.getMessage());
        }
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createUser(@Valid @RequestBody User user) {
        try {
            User createdUser = userService.createUser(user);
            return ApiResponseUtil.created(createdUser, "User created successfully");
        } catch (RuntimeException e) {
            return ApiResponseUtil.error("User creation failed: " + e.getMessage(), HttpStatus.CONFLICT);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateUser(@PathVariable Long id, @Valid @RequestBody User user) {
        try {
            User updatedUser = userService.updateUser(id, user);
            return ApiResponseUtil.success(updatedUser, "User updated successfully");
        } catch (RuntimeException e) {
            return ApiResponseUtil.notFound("User not found");
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteUser(@PathVariable Long id) {
        try {
            userService.deleteUser(id);
            return ApiResponseUtil.success(null, "User deleted successfully");
        } catch (RuntimeException e) {
            return ApiResponseUtil.notFound("User not found");
        }
    }

    @GetMapping("/username/{username}")
    public ResponseEntity<Map<String, Object>> getUserByUsername(@PathVariable String username) {
        try {
            Optional<User> user = userService.getUserByUsername(username);
            if (user.isPresent()) {
                return ApiResponseUtil.success(user.get(), "User retrieved successfully");
            }
            return ApiResponseUtil.notFound("User not found");
        } catch (Exception e) {
            return ApiResponseUtil.internalError("Failed to retrieve user: " + e.getMessage());
        }
    }

    @GetMapping("/email/{email}")
    public ResponseEntity<Map<String, Object>> getUserByEmail(@PathVariable String email) {
        try {
            Optional<User> user = userService.getUserByEmail(email);
            if (user.isPresent()) {
                return ApiResponseUtil.success(user.get(), "User retrieved successfully");
            }
            return ApiResponseUtil.notFound("User not found");
        } catch (Exception e) {
            return ApiResponseUtil.internalError("Failed to retrieve user: " + e.getMessage());
        }
    }

    @GetMapping("/role/{role}")
    public ResponseEntity<Map<String, Object>> getUsersByRole(@PathVariable String role) {
        try {
            List<User> users = userService.getUsersByRole(role);
            Map<String, Object> data = new HashMap<>();
            data.put("users", users);
            data.put("total", users.size());
            return ApiResponseUtil.success(data, "Users retrieved successfully");
        } catch (Exception e) {
            return ApiResponseUtil.internalError("Failed to retrieve users: " + e.getMessage());
        }
    }

    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> searchUsers(@RequestParam String search) {
        try {
            List<User> users = userService.searchUsers(search);
            Map<String, Object> data = new HashMap<>();
            data.put("users", users);
            data.put("total", users.size());
            return ApiResponseUtil.success(data, "Search completed successfully");
        } catch (Exception e) {
            return ApiResponseUtil.internalError("Failed to search users: " + e.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestParam String usernameOrEmail, @RequestParam String password) {
        try {
            User user = userService.login(usernameOrEmail, password);
            
            // Check if user account is active
            if (!user.getIsActive()) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("error", "Account is inactive. Please contact administrator for access.");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorResponse);
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("user", user);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", "Invalid username/email or password. Please check your credentials and try again.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
        }
    }
}

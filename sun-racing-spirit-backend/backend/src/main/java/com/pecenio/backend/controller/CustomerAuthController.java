package com.pecenio.backend.controller;

import com.pecenio.backend.service.UserService;
import com.pecenio.backend.service.JwtService;
import com.pecenio.backend.service.PasswordService;
import com.pecenio.backend.dto.LoginRequest;
import com.pecenio.backend.dto.RegisterRequest;
import com.pecenio.backend.util.ApiResponseUtil;
import com.pecenio.businessmodel.entity.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/customer/auth")
public class CustomerAuthController {

    @Autowired
    private UserService userService;
    
    @Autowired
    private JwtService jwtService;
    
    @Autowired
    private PasswordService passwordService;

    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@Valid @RequestBody RegisterRequest request) {
        try {
            // Validate password strength
            if (!passwordService.isValidPassword(request.getPassword())) {
                return ApiResponseUtil.error(passwordService.getPasswordRequirements(), HttpStatus.BAD_REQUEST);
            }
            
            // Validate age (must be 18+)
            LocalDateTime now = LocalDateTime.now();
            int age = now.getYear() - request.getDateOfBirth().getYear();
            if (now.getMonthValue() < request.getDateOfBirth().getMonthValue() || 
                (now.getMonthValue() == request.getDateOfBirth().getMonthValue() && now.getDayOfMonth() < request.getDateOfBirth().getDayOfMonth())) {
                age--;
            }
            
            if (age < 18) {
                return ApiResponseUtil.error("You must be 18 years or older to register", HttpStatus.BAD_REQUEST);
            }
            
            // Create user
            User user = new User();
            user.setUsername(request.getUsername().trim());
            user.setEmail(request.getEmail().trim().toLowerCase());
            user.setPassword(request.getPassword());
            user.setRole("CUSTOMER");
            user.setIsActive(true);
            user.setFirstName(request.getFirstName() != null ? request.getFirstName().trim() : null);
            user.setLastName(request.getLastName() != null ? request.getLastName().trim() : null);
            user.setPhoneNumber(request.getPhoneNumber() != null ? request.getPhoneNumber().trim() : null);
            user.setGender(request.getGender() != null ? request.getGender().trim() : null);
            user.setDateOfBirth(request.getDateOfBirth());
            
            User createdUser = userService.createUser(user);
            
            // Generate JWT token
            String token = jwtService.generateToken(createdUser.getUsername(), createdUser.getRole(), createdUser.getId());
            
            Map<String, Object> userData = new HashMap<>();
            userData.put("id", createdUser.getId());
            userData.put("username", createdUser.getUsername());
            userData.put("email", createdUser.getEmail());
            userData.put("role", createdUser.getRole());
            userData.put("firstName", createdUser.getFirstName() != null ? createdUser.getFirstName() : "");
            userData.put("lastName", createdUser.getLastName() != null ? createdUser.getLastName() : "");
            userData.put("phoneNumber", createdUser.getPhoneNumber() != null ? createdUser.getPhoneNumber() : "");
            userData.put("gender", createdUser.getGender() != null ? createdUser.getGender() : "");
            userData.put("dateOfBirth", createdUser.getDateOfBirth() != null ? createdUser.getDateOfBirth().toLocalDate().toString() : "");
            userData.put("profilePicture", createdUser.getProfilePicture());
            
            Map<String, Object> responseData = new HashMap<>();
            responseData.put("token", token);
            responseData.put("user", userData);
            
            return ApiResponseUtil.created(responseData, "Account created successfully");
            
        } catch (RuntimeException e) {
            return ApiResponseUtil.error(e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            return ApiResponseUtil.internalError("Registration failed. Please try again.");
        }
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@Valid @RequestBody LoginRequest request) {
        try {
            // Authenticate user
            User user = userService.login(request.getUsernameOrEmail().trim(), request.getPassword());
            
            // Check if user is a customer
            if (!"CUSTOMER".equals(user.getRole())) {
                return ApiResponseUtil.forbidden("Access denied. Customer account required.");
            }
            
            // Generate JWT token
            String token = jwtService.generateToken(user.getUsername(), user.getRole(), user.getId());
            
            Map<String, Object> userData = new HashMap<>();
            userData.put("id", user.getId());
            userData.put("username", user.getUsername());
            userData.put("email", user.getEmail());
            userData.put("role", user.getRole());
            userData.put("firstName", user.getFirstName() != null ? user.getFirstName() : "");
            userData.put("lastName", user.getLastName() != null ? user.getLastName() : "");
            userData.put("phoneNumber", user.getPhoneNumber() != null ? user.getPhoneNumber() : "");
            userData.put("gender", user.getGender() != null ? user.getGender() : "");
            userData.put("dateOfBirth", user.getDateOfBirth() != null ? user.getDateOfBirth().toLocalDate().toString() : "");
            userData.put("profilePicture", user.getProfilePicture());
            userData.put("address", user.getAddress() != null ? user.getAddress() : "");
            userData.put("city", user.getCity() != null ? user.getCity() : "");
            userData.put("state", user.getState() != null ? user.getState() : "");
            userData.put("postalCode", user.getPostalCode() != null ? user.getPostalCode() : "");
            userData.put("country", user.getCountry() != null ? user.getCountry() : "");
            
            Map<String, Object> responseData = new HashMap<>();
            responseData.put("token", token);
            responseData.put("user", userData);
            
            return ApiResponseUtil.success(responseData, "Login successful");
            
        } catch (RuntimeException e) {
            return ApiResponseUtil.error(e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            return ApiResponseUtil.internalError("Login failed. Please try again.");
        }
    }

    @PostMapping("/validate-token")
    public ResponseEntity<Map<String, Object>> validateToken(@RequestBody Map<String, String> request) {
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
            
            // Validate token
            if (jwtService.validateToken(token, username)) {
                response.put("success", true);
                response.put("message", "Token is valid");
                response.put("user", Map.of(
                    "id", userId,
                    "username", username,
                    "role", role
                ));
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "Invalid or expired token");
                return ResponseEntity.badRequest().body(response);
            }
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Token validation failed");
            return ResponseEntity.badRequest().body(response);
        }
    }

    @PutMapping("/profile")
    public ResponseEntity<Map<String, Object>> updateProfile(@RequestBody Map<String, Object> request) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Extract user ID from token (you'll need to implement this)
            // For now, we'll assume it's passed in the request
            Long userId = Long.valueOf(request.get("userId").toString());
            
            // Get existing user
            var existingUser = userService.getUserById(userId);
            if (existingUser.isEmpty()) {
                response.put("success", false);
                response.put("message", "User not found");
                return ResponseEntity.notFound().build();
            }
            
            User user = existingUser.get();
            
            // Update allowed fields with validation
            if (request.containsKey("firstName")) {
                String firstName = request.get("firstName").toString().trim();
                if (firstName.length() > 200) {
                    response.put("success", false);
                    response.put("message", "First name is too long (maximum 200 characters)");
                    return ResponseEntity.badRequest().body(response);
                }
                user.setFirstName(firstName);
            }
            if (request.containsKey("lastName")) {
                String lastName = request.get("lastName").toString().trim();
                if (lastName.length() > 200) {
                    response.put("success", false);
                    response.put("message", "Last name is too long (maximum 200 characters)");
                    return ResponseEntity.badRequest().body(response);
                }
                user.setLastName(lastName);
            }
            if (request.containsKey("email")) {
                String email = request.get("email").toString().trim().toLowerCase();
                // Check if email is already taken by another user
                var existingUserWithEmail = userService.getUserByEmail(email);
                if (existingUserWithEmail.isPresent() && !existingUserWithEmail.get().getId().equals(userId)) {
                    response.put("success", false);
                    response.put("message", "Email is already taken by another user");
                    return ResponseEntity.badRequest().body(response);
                }
                user.setEmail(email);
            }
            if (request.containsKey("phoneNumber")) {
                String phoneNumber = request.get("phoneNumber").toString().trim();
                if (phoneNumber.length() > 50) {
                    response.put("success", false);
                    response.put("message", "Phone number is too long (maximum 50 characters)");
                    return ResponseEntity.badRequest().body(response);
                }
                user.setPhoneNumber(phoneNumber);
            }
            if (request.containsKey("gender")) {
                user.setGender(request.get("gender").toString().trim());
            }
            if (request.containsKey("profilePicture")) {
                Object profilePictureObj = request.get("profilePicture");
                String profilePicture = profilePictureObj != null ? profilePictureObj.toString().trim() : "";
                
                System.out.println("Backend - Received profilePicture: " + (profilePictureObj == null ? "null" : "not null"));
                System.out.println("Backend - ProfilePicture value: '" + profilePicture + "'");
                
                // Validate base64 image data only if not empty
                if (!profilePicture.isEmpty() && !profilePicture.startsWith("data:image/")) {
                    response.put("success", false);
                    response.put("message", "Invalid profile picture format");
                    return ResponseEntity.badRequest().body(response);
                }
                user.setProfilePicture(profilePicture.isEmpty() ? null : profilePicture);
                System.out.println("Backend - Set profilePicture to: " + (user.getProfilePicture() == null ? "null" : "not null"));
            }
            if (request.containsKey("address")) {
                String address = request.get("address").toString().trim();
                if (address.length() > 1000) {
                    response.put("success", false);
                    response.put("message", "Address is too long (maximum 1000 characters)");
                    return ResponseEntity.badRequest().body(response);
                }
                user.setAddress(address);
            }
            if (request.containsKey("city")) {
                String city = request.get("city").toString().trim();
                if (city.length() > 200) {
                    response.put("success", false);
                    response.put("message", "City is too long (maximum 200 characters)");
                    return ResponseEntity.badRequest().body(response);
                }
                user.setCity(city);
            }
            if (request.containsKey("state")) {
                String state = request.get("state").toString().trim();
                if (state.length() > 200) {
                    response.put("success", false);
                    response.put("message", "State is too long (maximum 200 characters)");
                    return ResponseEntity.badRequest().body(response);
                }
                user.setState(state);
            }
            if (request.containsKey("postalCode")) {
                String postalCode = request.get("postalCode").toString().trim();
                if (postalCode.length() > 50) {
                    response.put("success", false);
                    response.put("message", "Postal code is too long (maximum 50 characters)");
                    return ResponseEntity.badRequest().body(response);
                }
                user.setPostalCode(postalCode);
            }
            if (request.containsKey("country")) {
                String country = request.get("country").toString().trim();
                if (country.length() > 200) {
                    response.put("success", false);
                    response.put("message", "Country is too long (maximum 200 characters)");
                    return ResponseEntity.badRequest().body(response);
                }
                user.setCountry(country);
            }
            
            // Update user
            User updatedUser = userService.updateUser(userId, user);
            
            response.put("success", true);
            response.put("message", "Profile updated successfully");
            Map<String, Object> userData = new HashMap<>();
            userData.put("id", updatedUser.getId());
            userData.put("username", updatedUser.getUsername());
            userData.put("email", updatedUser.getEmail());
            userData.put("firstName", updatedUser.getFirstName() != null ? updatedUser.getFirstName() : "");
            userData.put("lastName", updatedUser.getLastName() != null ? updatedUser.getLastName() : "");
            userData.put("phoneNumber", updatedUser.getPhoneNumber() != null ? updatedUser.getPhoneNumber() : "");
            userData.put("gender", updatedUser.getGender() != null ? updatedUser.getGender() : "");
            userData.put("dateOfBirth", updatedUser.getDateOfBirth() != null ? updatedUser.getDateOfBirth().toLocalDate().toString() : "");
            userData.put("profilePicture", updatedUser.getProfilePicture());
            System.out.println("Backend - Returning profilePicture: " + (updatedUser.getProfilePicture() == null ? "null" : "not null"));
            userData.put("address", updatedUser.getAddress() != null ? updatedUser.getAddress() : "");
            userData.put("city", updatedUser.getCity() != null ? updatedUser.getCity() : "");
            userData.put("state", updatedUser.getState() != null ? updatedUser.getState() : "");
            userData.put("postalCode", updatedUser.getPostalCode() != null ? updatedUser.getPostalCode() : "");
            userData.put("country", updatedUser.getCountry() != null ? updatedUser.getCountry() : "");
            response.put("user", userData);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            e.printStackTrace(); // Log the full error for debugging
            response.put("success", false);
            response.put("message", "Failed to update profile: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }


    @DeleteMapping("/profile")
    public ResponseEntity<Map<String, Object>> deleteProfile(@RequestBody Map<String, Object> request) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            Long userId = Long.valueOf(request.get("userId").toString());
            
            // Check if user exists
            var existingUser = userService.getUserById(userId);
            if (existingUser.isEmpty()) {
                response.put("success", false);
                response.put("message", "User not found");
                return ResponseEntity.notFound().build();
            }
            
            // Delete user
            userService.deleteUser(userId);
            
            response.put("success", true);
            response.put("message", "Account deleted successfully");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Failed to delete account: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}
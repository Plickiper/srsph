package com.pecenio.businessmodel.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class User {
    
    private Long id;
    
    @NotBlank(message = "Username is required")
    @Size(min = 3, max = 100, message = "Username must be between 3 and 100 characters")
    private String username;
    
    @NotBlank(message = "Email is required")
    @Email(message = "Email should be valid")
    @Size(max = 200, message = "Email must not exceed 200 characters")
    private String email;
    
    @NotBlank(message = "Password is required")
    @Size(min = 6, message = "Password must be at least 6 characters")
    private String password;
    
    @NotBlank(message = "Role is required")
    @Pattern(regexp = "^(SUPER_ADMIN|STAFF|CUSTOMER)$", message = "Role must be SUPER_ADMIN, STAFF, or CUSTOMER")
    private String role;
    
    @Size(max = 200, message = "First name must not exceed 200 characters")
    private String firstName;
    
    @Size(max = 200, message = "Last name must not exceed 200 characters")
    private String lastName;
    
    @Size(max = 50, message = "Phone number must not exceed 50 characters")
    private String phoneNumber;
    
    @Size(max = 1000, message = "Address must not exceed 1000 characters")
    private String address;
    
    @Size(max = 200, message = "City must not exceed 200 characters")
    private String city;
    
    @Size(max = 200, message = "State must not exceed 200 characters")
    private String state;
    
    @Size(max = 50, message = "Postal code must not exceed 50 characters")
    private String postalCode;
    
    @Size(max = 200, message = "Country must not exceed 200 characters")
    private String country;
    
    @Pattern(regexp = "^(male|female|other|prefer-not-to-say)$", message = "Gender must be male, female, other, or prefer-not-to-say")
    private String gender;
    
    @Past(message = "Date of birth must be in the past")
    private LocalDateTime dateOfBirth;
    
    @Size(max = 5000000, message = "Profile picture data must not exceed 5MB")
    private String profilePicture;
    
    private Boolean isActive = true;
    private LocalDateTime lastLoginAt;
    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime updatedAt = LocalDateTime.now();
}
package com.pecenio.datamodel.entity;

import com.pecenio.businessmodel.entity.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "users")
public class UserEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "username", nullable = false, unique = true, length = 100)
    private String username;
    
    @Column(name = "email", nullable = false, unique = true, length = 200)
    private String email;
    
    @Column(name = "password", nullable = false, length = 255)
    private String password;
    
    @Column(name = "role", nullable = false, length = 20)
    private String role;
    
    @Column(name = "first_name", length = 200)
    private String firstName;
    
    @Column(name = "last_name", length = 200)
    private String lastName;
    
    @Column(name = "phone_number", length = 50)
    private String phoneNumber;
    
    @Column(name = "address", length = 1000)
    private String address;
    
    @Column(name = "city", length = 200)
    private String city;
    
    @Column(name = "state", length = 200)
    private String state;
    
    @Column(name = "postal_code", length = 50)
    private String postalCode;
    
    @Column(name = "country", length = 200)
    private String country;
    
    @Column(name = "gender", length = 20)
    private String gender;
    
    @Column(name = "date_of_birth")
    private LocalDateTime dateOfBirth;
    
    @Column(name = "profile_picture", columnDefinition = "TEXT")
    private String profilePicture;
    
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
    
    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;
    
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
    
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    public UserEntity(User user) {
        this();
        this.username = user.getUsername();
        this.email = user.getEmail();
        this.password = user.getPassword();
        this.role = user.getRole();
        this.firstName = user.getFirstName();
        this.lastName = user.getLastName();
        this.phoneNumber = user.getPhoneNumber();
        this.address = user.getAddress();
        this.city = user.getCity();
        this.state = user.getState();
        this.postalCode = user.getPostalCode();
        this.country = user.getCountry();
        this.gender = user.getGender();
        this.dateOfBirth = user.getDateOfBirth();
        this.profilePicture = user.getProfilePicture();
        this.isActive = user.getIsActive();
        this.lastLoginAt = user.getLastLoginAt();
    }

    // Convert to business model
    public User toBusinessModel() {
        User user = new User();
        user.setId(this.id);
        user.setUsername(this.username);
        user.setEmail(this.email);
        user.setPassword(this.password);
        user.setRole(this.role);
        user.setFirstName(this.firstName);
        user.setLastName(this.lastName);
        user.setPhoneNumber(this.phoneNumber);
        user.setAddress(this.address);
        user.setCity(this.city);
        user.setState(this.state);
        user.setPostalCode(this.postalCode);
        user.setCountry(this.country);
        user.setGender(this.gender);
        user.setDateOfBirth(this.dateOfBirth);
        user.setProfilePicture(this.profilePicture);
        user.setIsActive(this.isActive);
        user.setLastLoginAt(this.lastLoginAt);
        user.setCreatedAt(this.createdAt);
        user.setUpdatedAt(this.updatedAt);
        return user;
    }

    // Update from business model
    public void updateFromBusinessModel(User user) {
        // Only update fields that are not null and different from current values
        if (user.getUsername() != null && !user.getUsername().equals(this.username)) {
            this.username = user.getUsername();
        }
        if (user.getEmail() != null && !user.getEmail().equals(this.email)) {
            this.email = user.getEmail();
        }
        if (user.getPassword() != null && !user.getPassword().equals(this.password)) {
            this.password = user.getPassword();
        }
        if (user.getRole() != null && !user.getRole().equals(this.role)) {
            this.role = user.getRole();
        }
        if (user.getFirstName() != null && !user.getFirstName().equals(this.firstName)) {
            this.firstName = user.getFirstName();
        }
        if (user.getLastName() != null && !user.getLastName().equals(this.lastName)) {
            this.lastName = user.getLastName();
        }
        if (user.getPhoneNumber() != null && !user.getPhoneNumber().equals(this.phoneNumber)) {
            this.phoneNumber = user.getPhoneNumber();
        }
        if (user.getAddress() != null && !user.getAddress().equals(this.address)) {
            this.address = user.getAddress();
        }
        if (user.getCity() != null && !user.getCity().equals(this.city)) {
            this.city = user.getCity();
        }
        if (user.getState() != null && !user.getState().equals(this.state)) {
            this.state = user.getState();
        }
        if (user.getPostalCode() != null && !user.getPostalCode().equals(this.postalCode)) {
            this.postalCode = user.getPostalCode();
        }
        if (user.getCountry() != null && !user.getCountry().equals(this.country)) {
            this.country = user.getCountry();
        }
        if (user.getGender() != null && !user.getGender().equals(this.gender)) {
            this.gender = user.getGender();
        }
        if (user.getDateOfBirth() != null && !user.getDateOfBirth().equals(this.dateOfBirth)) {
            this.dateOfBirth = user.getDateOfBirth();
        }
        // Profile picture: allow explicit clearing when value is null
        // The frontend sends the current value when unchanged, and null when removed
        // so we should always apply it as-is (including null) to persist deletions
        if (user.getProfilePicture() != null && !user.getProfilePicture().equals(this.profilePicture)) {
            this.profilePicture = user.getProfilePicture();
        } else if (user.getProfilePicture() == null && this.profilePicture != null) {
            this.profilePicture = null;
        }
        if (user.getIsActive() != null && !user.getIsActive().equals(this.isActive)) {
            this.isActive = user.getIsActive();
        }
        if (user.getLastLoginAt() != null && !user.getLastLoginAt().equals(this.lastLoginAt)) {
            this.lastLoginAt = user.getLastLoginAt();
        }
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
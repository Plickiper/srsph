package com.pecenio.backend.config;

import com.pecenio.backend.service.UserService;
import com.pecenio.businessmodel.entity.User;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;

import java.util.List;

@Component
@ConditionalOnBean(UserService.class)
public class DataInitializer {

    @Autowired
    private UserService userService;

    @Value("${app.superadmin.username:superadmin}")
    private String superAdminUsername;

    @Value("${app.superadmin.password:}")
    private String superAdminPassword;

    @Value("${app.superadmin.email:***}")
    private String superAdminEmail;

    @PostConstruct
    public void initializeData() {
        if (superAdminPassword != null && !superAdminPassword.isEmpty()) {
            createDefaultSuperAdmin();
        } else {
            System.out.println("Super Admin password not configured. Skipping creation.");
        }
    }

    private void createDefaultSuperAdmin() {
        try {
            // Check if any Super Admin exists
            List<User> superAdmins = userService.getUsersByRole("SUPER_ADMIN");
            
            if (superAdmins.isEmpty()) {
                // Create default Super Admin
                User superAdmin = new User();
                superAdmin.setUsername(superAdminUsername);
                superAdmin.setEmail(superAdminEmail);
                superAdmin.setPassword(superAdminPassword);
                superAdmin.setFirstName("Super");
                superAdmin.setLastName("Admin");
                superAdmin.setPhoneNumber("+63-912-345-6789");
                superAdmin.setRole("SUPER_ADMIN");
                superAdmin.setIsActive(true);
                
                userService.createUser(superAdmin);
                
                System.out.println("==========================================================");
                System.out.println("🚀 DEFAULT SUPER ADMIN ACCOUNT CREATED");
                System.out.println("==========================================================");
                System.out.println("Username: " + superAdminUsername);
                System.out.println("Email: " + superAdminEmail);
                System.out.println("Password: [CONFIGURED]");
                System.out.println("Role: SUPER_ADMIN");
                System.out.println("==========================================================");
                System.out.println("⚠️  IMPORTANT: Change the password immediately after first login!");
                System.out.println("==========================================================");
                
            } else {
                System.out.println("Super Admin account already exists. Skipping creation.");
            }
        } catch (Exception e) {
            System.err.println("Error creating default Super Admin: " + e.getMessage());
            e.printStackTrace();
        }
    }
}



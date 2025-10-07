package com.pecenio.backend.config;

import com.pecenio.backend.service.UserService;
import com.pecenio.businessmodel.entity.User;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;

import java.util.List;

@Component
@ConditionalOnBean(UserService.class)
public class DataInitializer {

    @Autowired
    private UserService userService;

    @PostConstruct
    public void initializeData() {
        createDefaultSuperAdmin();
    }

    private void createDefaultSuperAdmin() {
        try {
            // Check if any Super Admin exists
            List<User> superAdmins = userService.getUsersByRole("SUPER_ADMIN");
            
            if (superAdmins.isEmpty()) {
                // Create default Super Admin
                User superAdmin = new User();
                superAdmin.setUsername("superadmin");
                superAdmin.setEmail("***");
                superAdmin.setPassword("***"); // Change this in production!
                superAdmin.setFirstName("Super");
                superAdmin.setLastName("Admin");
                superAdmin.setPhoneNumber("+63-912-345-6789");
                superAdmin.setRole("SUPER_ADMIN");
                superAdmin.setIsActive(true);
                
                userService.createUser(superAdmin);
                
                System.out.println("==========================================================");
                System.out.println("🚀 DEFAULT SUPER ADMIN ACCOUNT CREATED");
                System.out.println("==========================================================");
                System.out.println("Username: superadmin");
                System.out.println("Email: ***");
                System.out.println("Password: ***");
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

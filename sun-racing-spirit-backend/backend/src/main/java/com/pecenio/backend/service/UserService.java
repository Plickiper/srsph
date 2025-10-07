package com.pecenio.backend.service;

import com.pecenio.businessmodel.entity.User;
import java.util.List;
import java.util.Optional;

public interface UserService {
    
    List<User> getAllUsers();
    
    Optional<User> getUserById(Long id);
    
    User createUser(User user);
    
    User updateUser(Long id, User user);
    
    void deleteUser(Long id);
    
    Optional<User> getUserByUsername(String username);
    
    Optional<User> getUserByEmail(String email);
    
    List<User> getUsersByRole(String role);
    
    List<User> searchUsers(String search);
    
    User login(String usernameOrEmail, String password);
    
    boolean existsByUsername(String username);
    
    boolean existsByEmail(String email);
}

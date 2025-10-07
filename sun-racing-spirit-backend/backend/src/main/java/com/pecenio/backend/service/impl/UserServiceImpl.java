package com.pecenio.backend.service.impl;

import com.pecenio.backend.service.UserService;
import com.pecenio.backend.service.PasswordService;
import com.pecenio.businessmodel.entity.User;
import com.pecenio.datamodel.entity.UserEntity;
import com.pecenio.datamodel.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
public class UserServiceImpl implements UserService {

    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private PasswordService passwordService;

    @Override
    @Transactional(readOnly = true)
    public List<User> getAllUsers() {
        List<UserEntity> entities = userRepository.findAll();
        return entities.stream()
                .map(UserEntity::toBusinessModel)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<User> getUserById(Long id) {
        return userRepository.findById(id)
                .map(UserEntity::toBusinessModel);
    }

    @Override
    public User createUser(User user) {
        // Validate password
        if (!passwordService.isValidPassword(user.getPassword())) {
            throw new RuntimeException(passwordService.getPasswordRequirements());
        }
        
        // Check if username or email already exists
        if (userRepository.existsByUsername(user.getUsername())) {
            throw new RuntimeException("Username already exists: " + user.getUsername());
        }
        if (userRepository.existsByEmail(user.getEmail())) {
            throw new RuntimeException("Email already exists: " + user.getEmail());
        }
        
        // Hash password before saving
        user.setPassword(passwordService.hashPassword(user.getPassword()));
        
        UserEntity entity = new UserEntity(user);
        UserEntity savedEntity = userRepository.save(entity);
        return savedEntity.toBusinessModel();
    }

    @Override
    public User updateUser(Long id, User user) {
        Optional<UserEntity> existingEntity = userRepository.findById(id);
        if (existingEntity.isPresent()) {
            UserEntity entity = existingEntity.get();
            entity.updateFromBusinessModel(user);
            UserEntity savedEntity = userRepository.save(entity);
            return savedEntity.toBusinessModel();
        }
        throw new RuntimeException("User not found with id: " + id);
    }

    @Override
    public void deleteUser(Long id) {
        if (userRepository.existsById(id)) {
            userRepository.deleteById(id);
        } else {
            throw new RuntimeException("User not found with id: " + id);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<User> getUserByUsername(String username) {
        return userRepository.findByUsername(username)
                .map(UserEntity::toBusinessModel);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<User> getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .map(UserEntity::toBusinessModel);
    }

    @Override
    @Transactional(readOnly = true)
    public List<User> getUsersByRole(String role) {
        List<UserEntity> entities = userRepository.findByRole(role);
        return entities.stream()
                .map(UserEntity::toBusinessModel)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<User> searchUsers(String search) {
        List<UserEntity> entities = userRepository.searchUsers(search);
        return entities.stream()
                .map(UserEntity::toBusinessModel)
                .collect(Collectors.toList());
    }

    @Override
    public User login(String usernameOrEmail, String password) {
        Optional<UserEntity> entity = userRepository.findByUsernameOrEmail(usernameOrEmail, usernameOrEmail);
        if (entity.isPresent() && passwordService.matches(password, entity.get().getPassword())) {
            // Check if user is active
            if (!entity.get().getIsActive()) {
                throw new RuntimeException("Account is deactivated. Please contact support.");
            }
            // Update last login time
            entity.get().setLastLoginAt(LocalDateTime.now());
            userRepository.save(entity.get());
            return entity.get().toBusinessModel();
        }
        throw new RuntimeException("Invalid username/email or password");
    }

    @Override
    @Transactional(readOnly = true)
    public boolean existsByUsername(String username) {
        return userRepository.existsByUsername(username);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean existsByEmail(String email) {
        return userRepository.existsByEmail(email);
    }
}

package com.pecenio.datamodel.repository;

import com.pecenio.datamodel.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<UserEntity, Long> {
    
    Optional<UserEntity> findByUsername(String username);
    
    Optional<UserEntity> findByEmail(String email);
    
    Optional<UserEntity> findByUsernameOrEmail(String username, String email);
    
    List<UserEntity> findByRole(String role);
    
    List<UserEntity> findByIsActive(Boolean isActive);
    
    @Query("SELECT u FROM UserEntity u WHERE u.role = :role AND u.isActive = true")
    List<UserEntity> findActiveUsersByRole(@Param("role") String role);
    
    @Query("SELECT u FROM UserEntity u WHERE u.username LIKE %:search% OR u.email LIKE %:search% OR u.firstName LIKE %:search% OR u.lastName LIKE %:search%")
    List<UserEntity> searchUsers(@Param("search") String search);
    
    boolean existsByUsername(String username);
    
    boolean existsByEmail(String email);
}
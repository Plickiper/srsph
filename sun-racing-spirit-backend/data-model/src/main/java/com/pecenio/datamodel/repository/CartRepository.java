package com.pecenio.datamodel.repository;

import com.pecenio.datamodel.entity.CartEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CartRepository extends JpaRepository<CartEntity, Long> {
    
    Optional<CartEntity> findByUserId(Long userId);
    
    Optional<CartEntity> findBySessionId(String sessionId);
    
    @Query("SELECT c FROM CartEntity c WHERE c.userId = :userId")
    Optional<CartEntity> findCartByUserId(@Param("userId") Long userId);
    
    @Query("SELECT c FROM CartEntity c WHERE c.sessionId = :sessionId")
    Optional<CartEntity> findCartBySessionId(@Param("sessionId") String sessionId);
    
    @Query("SELECT c FROM CartEntity c WHERE c.userId = :userId AND c.totalQuantity > 0")
    Optional<CartEntity> findActiveCartByUserId(@Param("userId") Long userId);
    
    @Query("SELECT c FROM CartEntity c WHERE c.sessionId = :sessionId AND c.totalQuantity > 0")
    Optional<CartEntity> findActiveCartBySessionId(@Param("sessionId") String sessionId);
    
    List<CartEntity> findByUserIdOrderByUpdatedAtDesc(Long userId);
    
    @Query("SELECT c FROM CartEntity c WHERE c.totalQuantity = 0")
    List<CartEntity> findEmptyCarts();
    
    @Query("SELECT c FROM CartEntity c WHERE c.updatedAt < :cutoffDate")
    List<CartEntity> findOldCarts(@Param("cutoffDate") java.time.LocalDateTime cutoffDate);
}
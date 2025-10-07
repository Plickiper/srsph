package com.pecenio.datamodel.repository;

import com.pecenio.datamodel.entity.OrderEntity;
import com.pecenio.datamodel.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<OrderEntity, Long> {
    
    List<OrderEntity> findByUser(UserEntity user);
    
    List<OrderEntity> findByUserAndStatus(UserEntity user, OrderEntity.OrderStatus status);
    
    List<OrderEntity> findByStatus(OrderEntity.OrderStatus status);
    
    List<OrderEntity> findByCreatedAtBetween(LocalDateTime startDate, LocalDateTime endDate);
    
    @Query("SELECT o FROM OrderEntity o WHERE o.user = :user ORDER BY o.createdAt DESC")
    List<OrderEntity> findByUserOrderByCreatedAtDesc(@Param("user") UserEntity user);
    
    @Query("SELECT o FROM OrderEntity o WHERE o.user.id = :userId ORDER BY o.createdAt DESC")
    List<OrderEntity> findByUserIdOrderByCreatedAtDesc(@Param("userId") Long userId);
    
    @Query("SELECT o FROM OrderEntity o WHERE o.status = :status ORDER BY o.createdAt ASC")
    List<OrderEntity> findByStatusOrderByCreatedAtAsc(@Param("status") OrderEntity.OrderStatus status);
    
    @Query("SELECT COUNT(o) FROM OrderEntity o WHERE o.user = :user")
    Long countByUser(@Param("user") UserEntity user);
    
    @Query("SELECT SUM(o.totalPrice) FROM OrderEntity o WHERE o.user = :user AND o.status = 'DELIVERED'")
    Double getTotalSpentByUser(@Param("user") UserEntity user);
}

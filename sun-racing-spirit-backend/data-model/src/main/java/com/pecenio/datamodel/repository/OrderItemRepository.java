package com.pecenio.datamodel.repository;

import com.pecenio.datamodel.entity.OrderItemEntity;
import com.pecenio.datamodel.entity.OrderEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderItemRepository extends JpaRepository<OrderItemEntity, Long> {
    
    List<OrderItemEntity> findByOrder(OrderEntity order);
    
    List<OrderItemEntity> findByOrderId(Long orderId);
}


package com.pecenio.datamodel.repository;

import com.pecenio.datamodel.entity.RatingEntity;
import com.pecenio.datamodel.entity.UserEntity;
import com.pecenio.datamodel.entity.ProductEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface RatingRepository extends JpaRepository<RatingEntity, Long> {
    
    List<RatingEntity> findByProductOrderByCreatedAtDesc(ProductEntity product);
    
    List<RatingEntity> findByUserOrderByCreatedAtDesc(UserEntity user);
    
    Optional<RatingEntity> findByUserAndProductAndOrder(UserEntity user, ProductEntity product, com.pecenio.datamodel.entity.OrderEntity order);
    
    boolean existsByUserAndProductAndOrder(UserEntity user, ProductEntity product, com.pecenio.datamodel.entity.OrderEntity order);
}


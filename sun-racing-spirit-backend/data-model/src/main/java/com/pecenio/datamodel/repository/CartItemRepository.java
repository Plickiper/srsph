package com.pecenio.datamodel.repository;

import com.pecenio.datamodel.entity.CartItemEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CartItemRepository extends JpaRepository<CartItemEntity, Long> {
    
    List<CartItemEntity> findByCartId(Long cartId);
    
    Optional<CartItemEntity> findByCartIdAndProductId(Long cartId, Long productId);
    
    @Query("SELECT ci FROM CartItemEntity ci WHERE ci.cartId = :cartId AND ci.productId = :productId AND ci.compatibility = :compatibility")
    Optional<CartItemEntity> findByCartIdAndProductIdAndCompatibility(
        @Param("cartId") Long cartId, 
        @Param("productId") Long productId, 
        @Param("compatibility") String compatibility
    );
    
    @Query("SELECT ci FROM CartItemEntity ci WHERE ci.cartId = :cartId ORDER BY ci.createdAt ASC")
    List<CartItemEntity> findCartItemsByCartIdOrderByCreatedAt(@Param("cartId") Long cartId);
    
    void deleteByCartId(Long cartId);
    
    void deleteByCartIdAndProductId(Long cartId, Long productId);
    
    @Query("SELECT COUNT(ci) FROM CartItemEntity ci WHERE ci.cartId = :cartId")
    Long countItemsInCart(@Param("cartId") Long cartId);
}

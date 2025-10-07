package com.pecenio.datamodel.entity;

import com.pecenio.businessmodel.entity.OrderItem;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "order_items")
public class OrderItemEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private OrderEntity order;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private ProductEntity product;
    
    @Column(name = "quantity", nullable = false)
    private Integer quantity;
    
    @Column(name = "price", nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    // Store selected variant/compatibility (e.g., size/model)
    @Column(name = "compatibility", length = 255)
    private String compatibility;

    public OrderItemEntity(OrderItem orderItem) {
        this.order = new OrderEntity(orderItem.getOrder());
        this.product = new ProductEntity(orderItem.getProduct());
        this.quantity = orderItem.getQuantity();
        this.price = orderItem.getPrice();
    }

    // Convert to business model
    public OrderItem toBusinessModel() {
        OrderItem orderItem = new OrderItem();
        orderItem.setId(this.id);
        orderItem.setOrder(this.order.toBusinessModel());
        orderItem.setProduct(this.product.toBusinessModel());
        orderItem.setQuantity(this.quantity);
        orderItem.setPrice(this.price);
        // business model currently has no explicit compatibility field
        return orderItem;
    }

    // Update from business model
    public void updateFromBusinessModel(OrderItem orderItem) {
        this.quantity = orderItem.getQuantity();
        this.price = orderItem.getPrice();
    }
}

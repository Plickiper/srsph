package com.pecenio.datamodel.entity;

import com.pecenio.businessmodel.entity.Order;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "orders")
public class OrderEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity user;
    
    @Column(name = "total_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalPrice;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private OrderStatus status;
    
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
    
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();
    
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<OrderItemEntity> orderItems;
    
    // Recipient information
    @Column(name = "recipient_name", length = 100)
    private String recipientName;
    
    @Column(name = "recipient_phone", length = 20)
    private String recipientPhone;
    
    @Column(name = "delivery_address", columnDefinition = "TEXT")
    private String deliveryAddress;
    
    // Payment method
    @Column(name = "payment_method", length = 20)
    private String paymentMethod;
    
    // Proof images
    @Column(name = "waybill_proof_url", length = 500)
    private String waybillProofUrl;
    
    @Column(name = "delivery_proof_url", length = 500)
    private String deliveryProofUrl;

    public enum OrderStatus {
        PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED
    }

    public OrderEntity(Order order) {
        this();
        this.user = new UserEntity(order.getUser());
        this.totalPrice = order.getTotalPrice();
        this.status = OrderStatus.valueOf(order.getStatus());
        this.recipientName = order.getRecipientName();
        this.recipientPhone = order.getRecipientPhone();
        this.deliveryAddress = order.getDeliveryAddress();
        this.paymentMethod = order.getPaymentMethod();
        this.waybillProofUrl = order.getWaybillProofUrl();
        this.deliveryProofUrl = order.getDeliveryProofUrl();
    }

    // Convert to business model
    public Order toBusinessModel() {
        Order order = new Order();
        order.setId(this.id);
        order.setUser(this.user.toBusinessModel());
        order.setTotalPrice(this.totalPrice);
        order.setStatus(this.status.name());
        order.setCreatedAt(this.createdAt);
        order.setUpdatedAt(this.updatedAt);
        order.setRecipientName(this.recipientName);
        order.setRecipientPhone(this.recipientPhone);
        order.setDeliveryAddress(this.deliveryAddress);
        order.setPaymentMethod(this.paymentMethod);
        order.setWaybillProofUrl(this.waybillProofUrl);
        order.setDeliveryProofUrl(this.deliveryProofUrl);
        
        if (this.orderItems != null) {
            order.setOrderItems(this.orderItems.stream()
                    .map(OrderItemEntity::toBusinessModel)
                    .collect(Collectors.toList()));
        }
        
        return order;
    }

    // Update from business model
    public void updateFromBusinessModel(Order order) {
        this.totalPrice = order.getTotalPrice();
        this.status = OrderStatus.valueOf(order.getStatus());
        this.recipientName = order.getRecipientName();
        this.recipientPhone = order.getRecipientPhone();
        this.deliveryAddress = order.getDeliveryAddress();
        this.paymentMethod = order.getPaymentMethod();
        this.waybillProofUrl = order.getWaybillProofUrl();
        this.deliveryProofUrl = order.getDeliveryProofUrl();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}

package com.pecenio.backend.controller;

import com.pecenio.datamodel.entity.OrderEntity;
import com.pecenio.datamodel.entity.OrderItemEntity;
import com.pecenio.datamodel.entity.UserEntity;
import com.pecenio.datamodel.entity.ProductEntity;
import com.pecenio.datamodel.repository.OrderRepository;
import com.pecenio.datamodel.repository.OrderItemRepository;
import com.pecenio.datamodel.repository.UserRepository;
import com.pecenio.datamodel.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    @Autowired
    private OrderRepository orderRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private ProductRepository productRepository;
    
    @Autowired
    private OrderItemRepository orderItemRepository;

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> getAllOrders() {
        try {
            // Get all orders sorted by creation date descending (most recent first)
            List<OrderEntity> entities = orderRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
            
            // Convert to simple DTOs to avoid circular references - include order items with products
            List<Map<String, Object>> orders = entities.stream()
                    .map(this::convertToSimpleOrderWithItems)
                    .collect(Collectors.toList());
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("orders", orders);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", "Failed to retrieve orders: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/user/{userId}")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> getOrdersByUser(@PathVariable Long userId) {
        try {
            List<OrderEntity> entities = orderRepository.findByUserIdOrderByCreatedAtDesc(userId);
            // Convert to simple DTOs to avoid circular references
            List<Map<String, Object>> orders = entities.stream()
                    .map(this::convertToSimpleOrderWithItems)
                    .collect(Collectors.toList());
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("orders", orders);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", "Failed to retrieve user orders: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createOrder(@RequestBody Map<String, Object> orderData) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Extract data from request
            Long userId = Long.valueOf(orderData.get("userId").toString());
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> items = (List<Map<String, Object>>) orderData.get("items");
            String paymentMethod = orderData.get("paymentMethod").toString();
            
            // Get user
            UserEntity user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));
            
            // Create order entity
            OrderEntity order = new OrderEntity();
            order.setUser(user);
            order.setStatus(OrderEntity.OrderStatus.PENDING);
            order.setPaymentMethod(paymentMethod);
            
            // Set recipient information from delivery data
            if (orderData.containsKey("fullName")) {
                order.setRecipientName(orderData.get("fullName").toString());
            }
            if (orderData.containsKey("phoneNumber")) {
                order.setRecipientPhone(orderData.get("phoneNumber").toString());
            }
            if (orderData.containsKey("address")) {
                String address = orderData.get("address").toString();
                if (orderData.containsKey("city")) {
                    address += ", " + orderData.get("city").toString();
                }
                if (orderData.containsKey("state")) {
                    address += ", " + orderData.get("state").toString();
                }
                if (orderData.containsKey("postalCode")) {
                    address += " " + orderData.get("postalCode").toString();
                }
                if (orderData.containsKey("country")) {
                    address += ", " + orderData.get("country").toString();
                }
                order.setDeliveryAddress(address);
            }
            
            // Calculate total price
            BigDecimal totalPrice = BigDecimal.ZERO;
            for (Map<String, Object> item : items) {
                BigDecimal price = new BigDecimal(item.get("price").toString());
                Integer quantity = Integer.valueOf(item.get("quantity").toString());
                totalPrice = totalPrice.add(price.multiply(BigDecimal.valueOf(quantity)));
            }
            order.setTotalPrice(totalPrice);
            
            // Save order first to get ID
            OrderEntity savedOrder = orderRepository.save(order);
            
            // Create order items - save them individually
            for (Map<String, Object> item : items) {
                Long productId = Long.valueOf(item.get("productId").toString());
                ProductEntity product = productRepository.findById(productId)
                        .orElseThrow(() -> new RuntimeException("Product not found: " + productId));
                
                OrderItemEntity orderItem = new OrderItemEntity();
                orderItem.setOrder(savedOrder);
                orderItem.setProduct(product);
                orderItem.setQuantity(Integer.valueOf(item.get("quantity").toString()));
                orderItem.setPrice(new BigDecimal(item.get("price").toString()));
                
                // Set compatibility if provided
                if (item.containsKey("size")) {
                    orderItem.setCompatibility(item.get("size").toString());
                }
                
                // Save the order item
                orderItemRepository.save(orderItem);
            }
            
            // Re-fetch the order with items to return complete data
            OrderEntity completeOrder = orderRepository.findById(savedOrder.getId()).orElse(savedOrder);
            
            response.put("success", true);
            response.put("message", "Order created successfully");
            response.put("order", convertToSimpleOrder(completeOrder));
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("error", "Failed to create order: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PutMapping("/{orderId}/waybill")
    public ResponseEntity<Map<String, Object>> uploadWaybillProof(
            @PathVariable Long orderId,
            @RequestParam("file") MultipartFile file) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Find the order
            OrderEntity order = orderRepository.findById(orderId)
                    .orElseThrow(() -> new RuntimeException("Order not found"));
            
            // Validate file
            if (file.isEmpty()) {
                response.put("success", false);
                response.put("error", "File is empty");
                return ResponseEntity.badRequest().body(response);
            }
            
            // Create upload directory if it doesn't exist
            String uploadDir = "backend/uploads/waybills";
            File directory = new File(uploadDir);
            if (!directory.exists()) {
                directory.mkdirs();
            }
            
            // Generate unique filename
            String originalFilename = file.getOriginalFilename();
            String extension = originalFilename != null && originalFilename.contains(".") 
                ? originalFilename.substring(originalFilename.lastIndexOf(".")) 
                : "";
            String filename = "waybill_" + orderId + "_" + UUID.randomUUID().toString() + extension;
            
            // Save file
            Path filePath = Paths.get(uploadDir, filename);
            Files.copy(file.getInputStream(), filePath);
            
            // Update order with waybill proof URL
            String waybillUrl = "/uploads/waybills/" + filename;
            order.setWaybillProofUrl(waybillUrl);
            order.setStatus(OrderEntity.OrderStatus.SHIPPED);
            orderRepository.save(order);
            
            response.put("success", true);
            response.put("message", "Waybill proof uploaded successfully");
            response.put("waybillUrl", waybillUrl);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("error", "Failed to upload waybill proof: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PutMapping("/{orderId}/delivery-proof")
    public ResponseEntity<Map<String, Object>> uploadDeliveryProof(
            @PathVariable Long orderId,
            @RequestParam("file") MultipartFile file) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Find the order
            OrderEntity order = orderRepository.findById(orderId)
                    .orElseThrow(() -> new RuntimeException("Order not found"));
            
            // Validate file
            if (file.isEmpty()) {
                response.put("success", false);
                response.put("error", "File is empty");
                return ResponseEntity.badRequest().body(response);
            }
            
            // Create upload directory if it doesn't exist
            String uploadDir = "backend/uploads/delivery-proofs";
            File directory = new File(uploadDir);
            if (!directory.exists()) {
                directory.mkdirs();
            }
            
            // Generate unique filename
            String originalFilename = file.getOriginalFilename();
            String extension = originalFilename != null && originalFilename.contains(".") 
                ? originalFilename.substring(originalFilename.lastIndexOf(".")) 
                : "";
            String filename = "delivery_" + orderId + "_" + UUID.randomUUID().toString() + extension;
            
            // Save file
            Path filePath = Paths.get(uploadDir, filename);
            Files.copy(file.getInputStream(), filePath);
            
            // Update order with delivery proof URL
            String deliveryUrl = "/uploads/delivery-proofs/" + filename;
            order.setDeliveryProofUrl(deliveryUrl);
            order.setStatus(OrderEntity.OrderStatus.DELIVERED);
            orderRepository.save(order);
            
            // Deduct stock and update sold counter for each order item
            if (order.getOrderItems() != null) {
                for (com.pecenio.datamodel.entity.OrderItemEntity orderItem : order.getOrderItems()) {
                    if (orderItem.getProduct() != null) {
                        ProductEntity product = orderItem.getProduct();
                        int orderedQuantity = orderItem.getQuantity();
                        
                        // Check if product has variants
                        if (product.getVariants() != null && !product.getVariants().isEmpty()) {
                            // Handle variant-based stock deduction
                            String compatibility = orderItem.getCompatibility();
                            if (compatibility != null && !compatibility.isEmpty()) {
                                try {
                                    // Parse variants JSON
                                    com.fasterxml.jackson.databind.ObjectMapper objectMapper = new com.fasterxml.jackson.databind.ObjectMapper();
                                    java.util.List<java.util.Map<String, Object>> variants = objectMapper.readValue(
                                        product.getVariants(), 
                                        new com.fasterxml.jackson.core.type.TypeReference<java.util.List<java.util.Map<String, Object>>>() {}
                                    );
                                    
                                    // Find matching variant and update its stock
                                    boolean variantFound = false;
                                    for (java.util.Map<String, Object> variant : variants) {
                                        String variantModel = (String) variant.get("model");
                                        if (variantModel != null && variantModel.equals(compatibility)) {
                                            // Update variant stock
                                            Integer variantStock = (Integer) variant.get("stockQuantity");
                                            if (variantStock != null) {
                                                int newVariantStock = variantStock - orderedQuantity;
                                                if (newVariantStock < 0) newVariantStock = 0;
                                                variant.put("stockQuantity", newVariantStock);
                                                variantFound = true;
                                                break;
                                            }
                                        }
                                    }
                                    
                                    if (variantFound) {
                                        // Update the variants JSON
                                        String updatedVariantsJson = objectMapper.writeValueAsString(variants);
                                        product.setVariants(updatedVariantsJson);
                                    }
                                } catch (Exception e) {
                                    System.err.println("Error updating variant stock: " + e.getMessage());
                                }
                            }
                        } else {
                            // Handle single product stock deduction
                            int currentStock = product.getStockQuantity();
                            int newStock = currentStock - orderedQuantity;
                            
                            // Ensure stock doesn't go negative
                            if (newStock < 0) {
                                newStock = 0;
                            }
                            
                            product.setStockQuantity(newStock);
                        }
                        
                        // Update sold counter (always update regardless of variant)
                        int currentSoldCount = product.getSoldCount();
                        int newSoldCount = currentSoldCount + orderedQuantity;
                        product.setSoldCount(newSoldCount);
                        
                        // Save updated product
                        productRepository.save(product);
                    }
                }
            }
            
            response.put("success", true);
            response.put("message", "Delivery proof uploaded successfully and stock updated");
            response.put("deliveryUrl", deliveryUrl);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("error", "Failed to upload delivery proof: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    private Map<String, Object> convertToSimpleOrder(OrderEntity entity) {
        Map<String, Object> order = new HashMap<>();
        order.put("id", entity.getId());
        // Expose both keys for compatibility with existing frontends
        order.put("totalAmount", entity.getTotalPrice()); // items total
        order.put("totalPrice", entity.getTotalPrice());  // legacy key used by web/admin UIs
        order.put("status", entity.getStatus().name());
        order.put("createdAt", entity.getCreatedAt());
        order.put("updatedAt", entity.getUpdatedAt());
        order.put("recipientName", entity.getRecipientName());
        order.put("recipientPhone", entity.getRecipientPhone());
        order.put("deliveryAddress", entity.getDeliveryAddress());
        order.put("paymentMethod", entity.getPaymentMethod());
        order.put("waybillProofUrl", entity.getWaybillProofUrl());
        order.put("deliveryProofUrl", entity.getDeliveryProofUrl());
        
        // Add user info without circular reference
        if (entity.getUser() != null) {
            Map<String, Object> user = new HashMap<>();
            user.put("id", entity.getUser().getId());
            user.put("username", entity.getUser().getUsername());
            user.put("email", entity.getUser().getEmail());
            user.put("firstName", entity.getUser().getFirstName());
            user.put("lastName", entity.getUser().getLastName());
            order.put("user", user);
        }
        
        // Add order items without circular reference
        if (entity.getOrderItems() != null) {
            List<Map<String, Object>> items = entity.getOrderItems().stream()
                    .map(this::convertToSimpleOrderItem)
                    .collect(Collectors.toList());
            order.put("items", items);
        }
        
        return order;
    }
    
    private Map<String, Object> convertToSimpleOrderWithItems(OrderEntity entity) {
        Map<String, Object> order = new HashMap<>();
        order.put("id", entity.getId());
        // Expose both keys for compatibility with existing frontends
        order.put("totalAmount", entity.getTotalPrice()); // items total
        order.put("totalPrice", entity.getTotalPrice());  // legacy key used by web/admin UIs
        order.put("status", entity.getStatus().name());
        order.put("createdAt", entity.getCreatedAt());
        order.put("updatedAt", entity.getUpdatedAt());
        order.put("recipientName", entity.getRecipientName());
        order.put("recipientPhone", entity.getRecipientPhone());
        order.put("deliveryAddress", entity.getDeliveryAddress());
        order.put("paymentMethod", entity.getPaymentMethod());
        order.put("waybillProofUrl", entity.getWaybillProofUrl());
        order.put("deliveryProofUrl", entity.getDeliveryProofUrl());
        
        // Add user info without circular reference
        if (entity.getUser() != null) {
            Map<String, Object> user = new HashMap<>();
            user.put("id", entity.getUser().getId());
            user.put("username", entity.getUser().getUsername());
            user.put("email", entity.getUser().getEmail());
            user.put("firstName", entity.getUser().getFirstName());
            user.put("lastName", entity.getUser().getLastName());
            order.put("user", user);
        }
        
        // Add order items with product data - force loading of lazy relationships
        List<Map<String, Object>> items = new ArrayList<>();
        try {
            // Force loading of order items by accessing the collection
            List<com.pecenio.datamodel.entity.OrderItemEntity> orderItems = entity.getOrderItems();
            if (orderItems != null && !orderItems.isEmpty()) {
                for (com.pecenio.datamodel.entity.OrderItemEntity itemEntity : orderItems) {
                    Map<String, Object> item = new HashMap<>();
                    item.put("id", itemEntity.getId());
                    item.put("quantity", itemEntity.getQuantity());
                    item.put("price", itemEntity.getPrice());
                    item.put("compatibility", itemEntity.getCompatibility());
                    
                    // Force loading of product data by accessing the product
                    try {
                        com.pecenio.datamodel.entity.ProductEntity productEntity = itemEntity.getProduct();
                        if (productEntity != null) {
                            Map<String, Object> product = new HashMap<>();
                            product.put("id", productEntity.getId());
                            product.put("name", productEntity.getName());
                            product.put("brand", productEntity.getBrand());
                            product.put("imageUrl", productEntity.getImageUrl());
                            product.put("category", productEntity.getCategory());
                            product.put("partNumber", productEntity.getPartNumber());
                            item.put("product", product);
                        }
                    } catch (Exception e) {
                        // If product loading fails, continue without product data
                        System.err.println("Error loading product for order item: " + e.getMessage());
                    }
                    
                    items.add(item);
                }
            }
        } catch (Exception e) {
            // If order items loading fails, continue with empty items
            System.err.println("Error loading order items: " + e.getMessage());
        }
        order.put("items", items);
        
        return order;
    }
    
    private Map<String, Object> convertToSimpleOrderItem(com.pecenio.datamodel.entity.OrderItemEntity entity) {
        Map<String, Object> item = new HashMap<>();
        item.put("id", entity.getId());
        item.put("quantity", entity.getQuantity());
        item.put("price", entity.getPrice());
        item.put("compatibility", entity.getCompatibility());
        
        // Add product info without circular reference
        if (entity.getProduct() != null) {
            Map<String, Object> product = new HashMap<>();
            product.put("id", entity.getProduct().getId());
            product.put("name", entity.getProduct().getName());
            product.put("brand", entity.getProduct().getBrand());
            product.put("imageUrl", entity.getProduct().getImageUrl());
            item.put("product", product);
        }
        
        return item;
    }
}
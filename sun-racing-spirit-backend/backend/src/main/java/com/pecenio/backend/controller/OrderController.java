package com.pecenio.backend.controller;

import com.pecenio.backend.dto.OrderRequest;
import com.pecenio.backend.dto.CancelOrderRequest;
import com.pecenio.backend.util.ApiResponseUtil;
import com.pecenio.backend.service.AuditLogService;
import com.pecenio.businessmodel.entity.AuditLog;
import com.pecenio.backend.util.JwtAuthUtil;
import com.pecenio.backend.service.JwtService;
import com.pecenio.datamodel.entity.OrderEntity;
import com.pecenio.datamodel.entity.OrderItemEntity;
import com.pecenio.datamodel.entity.UserEntity;
import com.pecenio.datamodel.entity.ProductEntity;
import com.pecenio.datamodel.repository.OrderRepository;
import com.pecenio.datamodel.repository.OrderItemRepository;
import com.pecenio.datamodel.repository.UserRepository;
import com.pecenio.datamodel.repository.ProductRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import jakarta.servlet.http.HttpServletRequest;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.UUID;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private static final Logger logger = LoggerFactory.getLogger(OrderController.class);

    @Autowired
    private OrderRepository orderRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private ProductRepository productRepository;
    
    @Autowired
    private OrderItemRepository orderItemRepository;
    
    @Autowired
    private AuditLogService auditLogService;
    
    @Autowired
    private JwtAuthUtil jwtAuthUtil;
    
    @Autowired
    private JwtService jwtService;

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> getAllOrders(
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) String order,
            HttpServletRequest request) {
        logger.info("📦 GET /api/orders - Fetching orders (limit: {})", limit);
        try {
            List<OrderEntity> entities;
            
            // Handle limit parameter
            if (limit != null && limit > 0) {
                // For recent orders with limit, get most recent first
                entities = orderRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
                // Apply limit after sorting
                if (entities.size() > limit) {
                    entities = entities.subList(0, limit);
                }
            } else {
                // Get all orders sorted by creation date descending (most recent first)
                entities = orderRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
            }
            
            logger.info("✅ Found {} orders", entities.size());
            
            // Convert to simple DTOs to avoid circular references - include order items with products
            List<Map<String, Object>> orders = entities.stream()
                    .map(this::convertToSimpleOrderWithItems)
                    .collect(Collectors.toList());
            
            Map<String, Object> data = new HashMap<>();
            data.put("orders", orders);
            data.put("total", orders.size());
            data.put("timestamp", java.time.LocalDateTime.now().toString());
            
            // Create response with cache control headers to prevent stale data
            Map<String, Object> responseBody = new HashMap<>();
            responseBody.put("success", true);
            responseBody.put("message", "Orders retrieved successfully");
            responseBody.put("data", data);
            
            HttpHeaders headers = new HttpHeaders();
            headers.add("Cache-Control", "no-cache, no-store, must-revalidate");
            headers.add("Pragma", "no-cache");
            headers.add("Expires", "0");
            
            // Log order viewing in audit log (staff action only)
            try {
                UserEntity currentAdmin = getCurrentAdminUser(request);
                if (currentAdmin != null) {
                    auditLogService.logAction(
                        currentAdmin.getId(),
                        currentAdmin.getFirstName() + " " + currentAdmin.getLastName(),
                        currentAdmin.getEmail(),
                        "VIEW_ORDERS",
                        "ORDER",
                        null, // No specific order ID for list view
                        "Orders List",
                        currentAdmin.getFirstName() + " " + currentAdmin.getLastName() + " viewed orders list (limit: " + (limit != null ? limit : "all") + ")",
                        getClientIpAddress(request),
                        request.getHeader("User-Agent"),
                        AuditLog.ActionType.READ,
                        AuditLog.Severity.LOW
                    );
                }
            } catch (Exception auditException) {
                // Audit logging failed, but continue with operation
                logger.warn("Failed to log order viewing audit: {}", auditException.getMessage());
            }
            
            return ResponseEntity.ok().headers(headers).body(responseBody);
        } catch (Exception e) {
            return ApiResponseUtil.internalError("Failed to retrieve orders: " + e.getMessage());
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
            
            Map<String, Object> data = new HashMap<>();
            data.put("orders", orders);
            data.put("total", orders.size());
            
            return ApiResponseUtil.success(data, "User orders retrieved successfully");
        } catch (Exception e) {
            return ApiResponseUtil.internalError("Failed to retrieve user orders: " + e.getMessage());
        }
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createOrder(@Valid @RequestBody OrderRequest orderRequest) {
        logger.info("=== ORDER CONTROLLER ===");
        logger.info("POST /api/orders - Create order request received");
        logger.info("Order request: userId={}, items count={}", orderRequest.getUserId(), orderRequest.getItems().size());
        try {
            // Get user
            UserEntity user = userRepository.findById(orderRequest.getUserId())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            
            // Create order entity
            OrderEntity order = new OrderEntity();
            order.setUser(user);
            order.setStatus(OrderEntity.OrderStatus.PENDING);
            order.setPaymentMethod(orderRequest.getPaymentMethod() != null ? orderRequest.getPaymentMethod() : "CASH_ON_DELIVERY");
            
            // Set recipient information
            if (orderRequest.getPhoneNumber() != null) {
                order.setRecipientPhone(orderRequest.getPhoneNumber());
            }
            
            // Set recipient name from user information
            String recipientName = "";
            if (user.getFirstName() != null && user.getLastName() != null) {
                recipientName = user.getFirstName() + " " + user.getLastName();
            } else if (user.getUsername() != null) {
                recipientName = user.getUsername();
            }
            order.setRecipientName(recipientName);
            
            // Build delivery address
            StringBuilder addressBuilder = new StringBuilder();
            if (orderRequest.getShippingAddress() != null) {
                addressBuilder.append(orderRequest.getShippingAddress());
            }
            if (orderRequest.getCity() != null) {
                addressBuilder.append(", ").append(orderRequest.getCity());
            }
            if (orderRequest.getState() != null) {
                addressBuilder.append(", ").append(orderRequest.getState());
            }
            if (orderRequest.getPostalCode() != null) {
                addressBuilder.append(" ").append(orderRequest.getPostalCode());
            }
            if (orderRequest.getCountry() != null) {
                addressBuilder.append(", ").append(orderRequest.getCountry());
            }
            order.setDeliveryAddress(addressBuilder.toString());
            
            // Calculate total price
            BigDecimal totalPrice = BigDecimal.ZERO;
            for (OrderRequest.OrderItemRequest item : orderRequest.getItems()) {
                ProductEntity product = productRepository.findById(item.getProductId())
                        .orElseThrow(() -> new RuntimeException("Product not found: " + item.getProductId()));
                
                BigDecimal itemTotal = product.getPrice().multiply(BigDecimal.valueOf(item.getQuantity()));
                totalPrice = totalPrice.add(itemTotal);
            }
            order.setTotalPrice(totalPrice);
            
            // Save order first to get ID
            OrderEntity savedOrder = orderRepository.save(order);
            
            // Create order items and update sold count
            for (OrderRequest.OrderItemRequest item : orderRequest.getItems()) {
                ProductEntity product = productRepository.findById(item.getProductId())
                        .orElseThrow(() -> new RuntimeException("Product not found: " + item.getProductId()));
                
                OrderItemEntity orderItem = new OrderItemEntity();
                orderItem.setOrder(savedOrder);
                orderItem.setProduct(product);
                orderItem.setQuantity(item.getQuantity());
                orderItem.setPrice(product.getPrice());
                
                // Set compatibility if provided
                if (item.getCompatibility() != null) {
                    orderItem.setCompatibility(item.getCompatibility());
                }
                
                // Save the order item
                orderItemRepository.save(orderItem);
                
                // Note: Sold count is updated only when delivery proof is uploaded
            }
            
            // Re-fetch the order with items to return complete data
            OrderEntity completeOrder = orderRepository.findById(savedOrder.getId()).orElse(savedOrder);
            
            // Note: Customer order creation is not logged in admin audit log
            // Only staff/admin interactions with orders are logged
            
            return ApiResponseUtil.created(convertToSimpleOrder(completeOrder), "Order created successfully");
            
        } catch (Exception e) {
            return ApiResponseUtil.internalError("Failed to create order: " + e.getMessage());
        }
    }

    @PutMapping("/{orderId}/waybill")
    public ResponseEntity<Map<String, Object>> uploadWaybillProof(
            @PathVariable Long orderId,
            @RequestParam("file") MultipartFile file,
            HttpServletRequest request) {
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
            String waybillUrl = "/api/static/waybills/" + filename;
            order.setWaybillProofUrl(waybillUrl);
            order.setStatus(OrderEntity.OrderStatus.SHIPPED);
            orderRepository.save(order);
            
            // Log waybill upload and status change in audit log (staff action only)
            try {
                UserEntity currentAdmin = getCurrentAdminUser(request);
                if (currentAdmin != null) {
                    auditLogService.logAction(
                        currentAdmin.getId(),
                        currentAdmin.getFirstName() + " " + currentAdmin.getLastName(),
                        currentAdmin.getEmail(),
                        "UPLOAD_WAYBILL",
                        "ORDER",
                        order.getId(),
                        "Order #" + order.getId(),
                        "Waybill proof uploaded for Order #" + order.getId() + " - Status changed to SHIPPED by " + currentAdmin.getFirstName() + " " + currentAdmin.getLastName(),
                        getClientIpAddress(request),
                        request.getHeader("User-Agent"),
                        AuditLog.ActionType.UPDATE,
                        AuditLog.Severity.MEDIUM
                    );
                }
            } catch (Exception auditException) {
                // Audit logging failed, but continue with operation
                logger.warn("Failed to log waybill upload audit: {}", auditException.getMessage());
            }
            
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
            @RequestParam("file") MultipartFile file,
            HttpServletRequest request) {
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
            String deliveryUrl = "/api/static/delivery-proofs/" + filename;
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
                        
                        // Update sold counter when delivery proof is uploaded
                        int currentSoldCount = product.getSoldCount();
                        int newSoldCount = currentSoldCount + orderedQuantity;
                        product.setSoldCount(newSoldCount);
                        
                        logger.info("Updated sold count for product {}: {} -> {}", 
                            product.getName(), currentSoldCount, newSoldCount);
                        
                        // Save updated product
                        productRepository.save(product);
                    }
                }
            }
            
            // Log delivery proof upload and status change in audit log (staff action only)
            try {
                UserEntity currentAdmin = getCurrentAdminUser(request);
                if (currentAdmin != null) {
                    auditLogService.logAction(
                        currentAdmin.getId(),
                        currentAdmin.getFirstName() + " " + currentAdmin.getLastName(),
                        currentAdmin.getEmail(),
                        "UPLOAD_DELIVERY_PROOF",
                        "ORDER",
                        order.getId(),
                        "Order #" + order.getId(),
                        "Delivery proof uploaded for Order #" + order.getId() + " - Status changed to DELIVERED by " + currentAdmin.getFirstName() + " " + currentAdmin.getLastName(),
                        getClientIpAddress(request),
                        request.getHeader("User-Agent"),
                        AuditLog.ActionType.UPDATE,
                        AuditLog.Severity.MEDIUM
                    );
                }
            } catch (Exception auditException) {
                // Audit logging failed, but continue with operation
                logger.warn("Failed to log delivery proof upload audit: {}", auditException.getMessage());
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

    @PutMapping("/{orderId}/status")
    public ResponseEntity<Map<String, Object>> updateOrderStatus(
            @PathVariable Long orderId,
            @RequestBody Map<String, String> statusRequest,
            HttpServletRequest request) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Find the order
            OrderEntity order = orderRepository.findById(orderId)
                    .orElseThrow(() -> new RuntimeException("Order not found"));
            
            String newStatus = statusRequest.get("status");
            if (newStatus == null || newStatus.trim().isEmpty()) {
                response.put("success", false);
                response.put("error", "Status is required");
                return ResponseEntity.badRequest().body(response);
            }
            
            // Validate status
            OrderEntity.OrderStatus orderStatus;
            try {
                orderStatus = OrderEntity.OrderStatus.valueOf(newStatus.toUpperCase());
            } catch (IllegalArgumentException e) {
                response.put("success", false);
                response.put("error", "Invalid status: " + newStatus);
                return ResponseEntity.badRequest().body(response);
            }
            
            // Store old status for audit log
            String oldStatus = order.getStatus().name();
            
            // Update order status
            order.setStatus(orderStatus);
            order.setUpdatedAt(LocalDateTime.now());
            orderRepository.save(order);
            
            // Log order status update in audit log (staff action only)
            try {
                UserEntity currentAdmin = getCurrentAdminUser(request);
                if (currentAdmin != null) {
                    auditLogService.logAction(
                        currentAdmin.getId(),
                        currentAdmin.getFirstName() + " " + currentAdmin.getLastName(),
                        currentAdmin.getEmail(),
                        "UPDATE_ORDER_STATUS",
                        "ORDER",
                        order.getId(),
                        "Order #" + order.getId(),
                        "Order #" + order.getId() + " status changed from " + oldStatus + " to " + newStatus.toUpperCase() + " by " + currentAdmin.getFirstName() + " " + currentAdmin.getLastName(),
                        getClientIpAddress(request),
                        request.getHeader("User-Agent"),
                        AuditLog.ActionType.UPDATE,
                        AuditLog.Severity.MEDIUM
                    );
                }
            } catch (Exception auditException) {
                // Audit logging failed, but continue with operation
                logger.warn("Failed to log order status update audit: {}", auditException.getMessage());
            }
            
            response.put("success", true);
            response.put("message", "Order status updated successfully");
            response.put("orderId", order.getId());
            response.put("oldStatus", oldStatus);
            response.put("newStatus", newStatus.toUpperCase());
            response.put("updatedAt", order.getUpdatedAt());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("error", "Failed to update order status: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PostMapping("/cancel")
    public ResponseEntity<Map<String, Object>> cancelOrder(@Valid @RequestBody CancelOrderRequest cancelRequest) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Find the order
            OrderEntity order = orderRepository.findById(cancelRequest.getOrderId())
                    .orElseThrow(() -> new RuntimeException("Order not found"));
            
            // Check if order can be cancelled (only PENDING orders can be cancelled)
            if (order.getStatus() != OrderEntity.OrderStatus.PENDING) {
                response.put("success", false);
                response.put("error", "Only pending orders can be cancelled");
                return ResponseEntity.badRequest().body(response);
            }
            
            // Update order status and cancellation details
            order.setStatus(OrderEntity.OrderStatus.CANCELLED);
            order.setCancellationReason(cancelRequest.getReason());
            order.setCancelledAt(LocalDateTime.now());
            order.setUpdatedAt(LocalDateTime.now());
            
            // Save the updated order
            orderRepository.save(order);
            
            // Note: Customer order cancellation is not logged in admin audit log
            // Only staff/admin interactions with orders are logged
            
            response.put("success", true);
            response.put("message", "Order cancelled successfully");
            response.put("orderId", order.getId());
            response.put("cancellationReason", order.getCancellationReason());
            response.put("cancelledAt", order.getCancelledAt());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("error", "Failed to cancel order: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/cancellation-reasons")
    public ResponseEntity<Map<String, Object>> getCancellationReasons() {
        Map<String, Object> response = new HashMap<>();
        
        try {
            List<Map<String, String>> reasons = new ArrayList<>();
            for (CancelOrderRequest.CancellationReason reason : CancelOrderRequest.CancellationReason.values()) {
                Map<String, String> reasonMap = new HashMap<>();
                reasonMap.put("value", reason.name());
                reasonMap.put("displayName", reason.getDisplayName());
                reasons.add(reasonMap);
            }
            
            response.put("success", true);
            response.put("reasons", reasons);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("success", false);
            response.put("error", "Failed to get cancellation reasons: " + e.getMessage());
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
        order.put("cancellationReason", entity.getCancellationReason());
        order.put("cancelledAt", entity.getCancelledAt());
        
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
        
        // Add order items with product data - use repository to avoid lazy loading issues
        List<Map<String, Object>> items = new ArrayList<>();
        try {
            // Use repository to load order items to avoid lazy loading issues
            List<com.pecenio.datamodel.entity.OrderItemEntity> orderItems = orderItemRepository.findByOrder(entity);
            if (orderItems != null && !orderItems.isEmpty()) {
                for (com.pecenio.datamodel.entity.OrderItemEntity itemEntity : orderItems) {
                    Map<String, Object> item = new HashMap<>();
                    item.put("id", itemEntity.getId());
                    item.put("quantity", itemEntity.getQuantity());
                    item.put("price", itemEntity.getPrice());
                    item.put("compatibility", itemEntity.getCompatibility());
                    
                    // Load product data safely
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
                        } else {
                            // Add empty product if product is null
                            Map<String, Object> product = new HashMap<>();
                            product.put("id", 0);
                            product.put("name", "Unknown Product");
                            product.put("brand", "Unknown");
                            product.put("imageUrl", "");
                            product.put("category", "Unknown");
                            product.put("partNumber", "");
                            item.put("product", product);
                        }
                    } catch (Exception e) {
                        // If product loading fails, add empty product
                        System.err.println("Error loading product for order item: " + e.getMessage());
                        Map<String, Object> product = new HashMap<>();
                        product.put("id", 0);
                        product.put("name", "Unknown Product");
                        product.put("brand", "Unknown");
                        product.put("imageUrl", "");
                        product.put("category", "Unknown");
                        product.put("partNumber", "");
                        item.put("product", product);
                    }
                    
                    items.add(item);
                }
            }
        } catch (Exception e) {
            // If order items loading fails, continue with empty items
            System.err.println("Error loading order items: " + e.getMessage());
            e.printStackTrace();
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
    
    private String getClientIpAddress(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty() && !"unknown".equalsIgnoreCase(xForwardedFor)) {
            return xForwardedFor.split(",")[0].trim();
        }
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty() && !"unknown".equalsIgnoreCase(xRealIp)) {
            return xRealIp;
        }
        return request.getRemoteAddr();
    }
    
    private UserEntity getCurrentAdminUser(HttpServletRequest request) {
        try {
            String token = jwtAuthUtil.extractTokenFromRequest(request);
            logger.info("🔍 OrderController - Token extracted: {}", token != null ? "YES" : "NO");
            
            if (token != null && jwtAuthUtil.isTokenValid(token)) {
                String username = jwtService.extractUsername(token);
                logger.info("🔍 OrderController - Username extracted: {}", username);
                
                UserEntity user = userRepository.findByUsername(username).orElse(null);
                if (user != null) {
                    logger.info("🔍 OrderController - User found: {} {} ({})", user.getFirstName(), user.getLastName(), user.getRole());
                } else {
                    logger.warn("🔍 OrderController - User not found for username: {}", username);
                }
                return user;
            } else {
                logger.warn("🔍 OrderController - Token is null or invalid");
            }
        } catch (Exception e) {
            logger.warn("Failed to get current admin user: {}", e.getMessage());
        }
        return null;
    }
}
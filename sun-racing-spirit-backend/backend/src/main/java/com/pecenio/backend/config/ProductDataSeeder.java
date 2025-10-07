package com.pecenio.backend.config;

import com.pecenio.backend.service.ProductService;
import com.pecenio.businessmodel.entity.Product;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

@Component
public class ProductDataSeeder {

    @Autowired
    private ProductService productService;
    
    private final ObjectMapper objectMapper = new ObjectMapper();

    @PostConstruct
    public void seedProducts() {
        try {
            // Check if products already exist
            if (productService.getAllProducts().isEmpty()) {
                System.out.println("🌱 Seeding product data...");
                createSampleProducts();
                System.out.println("✅ Product data seeded successfully!");
            } else {
                System.out.println("📦 Products already exist. Skipping seeding.");
            }
        } catch (Exception e) {
            System.err.println("❌ Error seeding product data: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private void createSampleProducts() throws Exception {
        // Product 1: CVT Set
        Product cvtSet = new Product();
        cvtSet.setName("CVT Set");
        cvtSet.setDescription("High-performance CVT set for enhanced motorcycle performance. Compatible with various Yamaha and Honda models.");
        cvtSet.setPrice(new BigDecimal("1200.00"));
        cvtSet.setStockQuantity(2000); // Total stock
        cvtSet.setPartNumber("CVT-001");
        cvtSet.setCategory("Engine Parts");
        cvtSet.setBrand("Sun Racing Spirit");
        cvtSet.setCompatibility("Yamaha Mio Soul i 115, Yamaha Mio i 125, Honda Click 125i, Honda PCX 160");
        cvtSet.setIsPublished(true);
        cvtSet.setIsFeatured(true);
        cvtSet.setImageUrl("https://via.placeholder.com/400x300?text=CVT+Set");
        cvtSet.setImages(objectMapper.writeValueAsString(Arrays.asList(
            "https://via.placeholder.com/400x300?text=CVT+Set+1",
            "https://via.placeholder.com/400x300?text=CVT+Set+2"
        )));
        
        // Create variants JSON for CVT Set
        List<Map<String, Object>> cvtVariants = Arrays.asList(
            createVariantMap("Yamaha Mio Soul i 115", 500, new BigDecimal("1200.00")),
            createVariantMap("Yamaha Mio i 125", 500, new BigDecimal("1200.00")),
            createVariantMap("Honda Click 125i", 500, new BigDecimal("1200.00")),
            createVariantMap("Honda PCX 160", 500, new BigDecimal("1200.00"))
        );
        cvtSet.setVariants(objectMapper.writeValueAsString(cvtVariants));
        
        productService.createProduct(cvtSet);

        // Product 2: Center Spring
        Product centerSpring = new Product();
        centerSpring.setName("Center Spring");
        centerSpring.setDescription("Durable center spring for improved suspension performance. Perfect for racing applications.");
        centerSpring.setPrice(new BigDecimal("800.00"));
        centerSpring.setStockQuantity(900); // Total stock
        centerSpring.setPartNumber("SPR-001");
        centerSpring.setCategory("Suspension");
        centerSpring.setBrand("Sun Racing Spirit");
        centerSpring.setCompatibility("Yamaha Mio Soul i 115, Yamaha Mio i 125, Honda Click 125i");
        centerSpring.setIsPublished(true);
        centerSpring.setIsFeatured(false);
        centerSpring.setImageUrl("https://via.placeholder.com/400x300?text=Center+Spring");
        centerSpring.setImages(objectMapper.writeValueAsString(Arrays.asList(
            "https://via.placeholder.com/400x300?text=Center+Spring+1"
        )));
        
        // Create variants JSON for Center Spring
        List<Map<String, Object>> springVariants = Arrays.asList(
            createVariantMap("Yamaha Mio Soul i 115", 300, new BigDecimal("800.00")),
            createVariantMap("Yamaha Mio i 125", 300, new BigDecimal("800.00")),
            createVariantMap("Honda Click 125i", 300, new BigDecimal("800.00"))
        );
        centerSpring.setVariants(objectMapper.writeValueAsString(springVariants));
        
        productService.createProduct(centerSpring);

        // Product 3: Racing Clutch
        Product racingClutch = new Product();
        racingClutch.setName("Racing Clutch");
        racingClutch.setDescription("High-performance racing clutch for maximum power transfer. Designed for competitive racing.");
        racingClutch.setPrice(new BigDecimal("1500.00"));
        racingClutch.setStockQuantity(800); // Total stock
        racingClutch.setPartNumber("CLT-001");
        racingClutch.setCategory("Transmission");
        racingClutch.setBrand("Sun Racing Spirit");
        racingClutch.setCompatibility("Yamaha Mio Soul i 115, Yamaha Mio i 125, Honda Click 125i, Honda PCX 160");
        racingClutch.setIsPublished(true);
        racingClutch.setIsFeatured(true);
        racingClutch.setImageUrl("https://via.placeholder.com/400x300?text=Racing+Clutch");
        racingClutch.setImages(objectMapper.writeValueAsString(Arrays.asList(
            "https://via.placeholder.com/400x300?text=Racing+Clutch+1",
            "https://via.placeholder.com/400x300?text=Racing+Clutch+2",
            "https://via.placeholder.com/400x300?text=Racing+Clutch+3"
        )));
        
        // Create variants JSON for Racing Clutch
        List<Map<String, Object>> clutchVariants = Arrays.asList(
            createVariantMap("Yamaha Mio Soul i 115", 200, new BigDecimal("1500.00")),
            createVariantMap("Yamaha Mio i 125", 200, new BigDecimal("1500.00")),
            createVariantMap("Honda Click 125i", 200, new BigDecimal("1500.00")),
            createVariantMap("Honda PCX 160", 200, new BigDecimal("1500.00"))
        );
        racingClutch.setVariants(objectMapper.writeValueAsString(clutchVariants));
        
        productService.createProduct(racingClutch);

        System.out.println("📦 Created 3 sample products with variants");
    }

    private Map<String, Object> createVariantMap(String model, int stock, BigDecimal price) {
        Map<String, Object> variant = new HashMap<>();
        variant.put("model", model);
        variant.put("stockQuantity", stock);
        variant.put("price", price);
        return variant;
    }
}
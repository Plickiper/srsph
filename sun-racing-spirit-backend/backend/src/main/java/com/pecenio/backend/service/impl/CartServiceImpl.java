package com.pecenio.backend.service.impl;

import com.pecenio.backend.service.CartService;
import com.pecenio.businessmodel.entity.Cart;
import com.pecenio.businessmodel.entity.CartItem;
import com.pecenio.datamodel.entity.CartEntity;
import com.pecenio.datamodel.entity.CartItemEntity;
import com.pecenio.datamodel.entity.ProductEntity;
import com.pecenio.datamodel.repository.CartItemRepository;
import com.pecenio.datamodel.repository.CartRepository;
import com.pecenio.datamodel.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class CartServiceImpl implements CartService {

    @Autowired
    private CartRepository cartRepository;

    @Autowired
    private CartItemRepository cartItemRepository;

    @Autowired
    private ProductRepository productRepository;

    @Override
    @Transactional(readOnly = true)
    public Optional<Cart> getCartByUserId(Long userId) {
        return cartRepository.findByUserId(userId)
                .map(CartEntity::toBusinessModel);
    }

    @Override
    public Cart createCart(Long userId) {
        // Check if cart already exists
        Optional<CartEntity> existingCart = cartRepository.findByUserId(userId);
        if (existingCart.isPresent()) {
            return existingCart.get().toBusinessModel();
        }

        Cart cart = new Cart();
        cart.setUserId(userId);
        cart.setTotalPrice(BigDecimal.ZERO);
        cart.setTotalQuantity(0);

        CartEntity entity = new CartEntity(cart);
        CartEntity savedEntity = cartRepository.save(entity);
        return savedEntity.toBusinessModel();
    }

    @Override
    public Cart addItemToCart(Long userId, CartItem cartItem) {
        // Get or create cart for user
        CartEntity cartEntity = cartRepository.findByUserId(userId)
                .orElseGet(() -> {
                    Cart cart = new Cart();
                    cart.setUserId(userId);
                    cart.setTotalPrice(BigDecimal.ZERO);
                    cart.setTotalQuantity(0);
                    return cartRepository.save(new CartEntity(cart));
                });

        // Check if product exists
        Optional<ProductEntity> productEntity = productRepository.findById(cartItem.getProductId());
        if (!productEntity.isPresent()) {
            throw new RuntimeException("Product not found with id: " + cartItem.getProductId());
        }

        // Set price from product and cartId
        cartItem.setPrice(productEntity.get().getPrice());
        cartItem.setCartId(cartEntity.getId());

        // Check if item already exists in cart
        Optional<CartItemEntity> existingItem = cartItemRepository
                .findByCartIdAndProductIdAndCompatibility(
                    cartEntity.getId(), 
                    cartItem.getProductId(), 
                    cartItem.getCompatibility()
                );

        if (existingItem.isPresent()) {
            // Update quantity
            existingItem.get().setQuantity(existingItem.get().getQuantity() + cartItem.getQuantity());
            cartItemRepository.save(existingItem.get());
        } else {
            // Add new item
            CartItemEntity itemEntity = new CartItemEntity(cartItem);
            cartItemRepository.save(itemEntity);
        }

        // Recalculate cart totals
        recalculateCartTotals(cartEntity.getId());

        return cartRepository.findById(cartEntity.getId()).get().toBusinessModel();
    }

    @Override
    public Cart updateCartItem(Long itemId, CartItem cartItem) {
        Optional<CartItemEntity> itemEntity = cartItemRepository.findById(itemId);
        if (!itemEntity.isPresent()) {
            throw new RuntimeException("Cart item not found with id: " + itemId);
        }

        itemEntity.get().updateFromBusinessModel(cartItem);
        cartItemRepository.save(itemEntity.get());

        // Recalculate cart totals
        recalculateCartTotals(itemEntity.get().getCartId());

        return cartRepository.findById(itemEntity.get().getCartId()).get().toBusinessModel();
    }

    @Override
    public Cart removeCartItem(Long itemId) {
        Optional<CartItemEntity> itemEntity = cartItemRepository.findById(itemId);
        if (!itemEntity.isPresent()) {
            throw new RuntimeException("Cart item not found with id: " + itemId);
        }

        Long cartId = itemEntity.get().getCartId();
        cartItemRepository.deleteById(itemId);

        // Recalculate cart totals
        recalculateCartTotals(cartId);

        return cartRepository.findById(cartId).get().toBusinessModel();
    }

    @Override
    public void clearCart(Long userId) {
        Optional<CartEntity> cartEntity = cartRepository.findByUserId(userId);
        if (!cartEntity.isPresent()) {
            throw new RuntimeException("Cart not found for user id: " + userId);
        }

        cartItemRepository.deleteByCartId(cartEntity.get().getId());
        
        // Reset cart totals
        cartEntity.get().setTotalPrice(BigDecimal.ZERO);
        cartEntity.get().setTotalQuantity(0);
        cartRepository.save(cartEntity.get());
    }

    private void recalculateCartTotals(Long cartId) {
        List<CartItemEntity> items = cartItemRepository.findByCartId(cartId);
        
        int totalQuantity = items.stream()
                .mapToInt(CartItemEntity::getQuantity)
                .sum();
        
        BigDecimal totalPrice = items.stream()
                .map(item -> item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Optional<CartEntity> cartEntity = cartRepository.findById(cartId);
        if (cartEntity.isPresent()) {
            cartEntity.get().setTotalQuantity(totalQuantity);
            cartEntity.get().setTotalPrice(totalPrice);
            cartRepository.save(cartEntity.get());
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Cart> getCartBySessionId(String sessionId) {
        return cartRepository.findBySessionId(sessionId)
                .map(CartEntity::toBusinessModel);
    }

    @Override
    public Cart createGuestCart(String sessionId) {
        // Check if cart already exists
        Optional<CartEntity> existingCart = cartRepository.findBySessionId(sessionId);
        if (existingCart.isPresent()) {
            return existingCart.get().toBusinessModel();
        }

        Cart cart = new Cart();
        cart.setSessionId(sessionId);
        cart.setTotalPrice(BigDecimal.ZERO);
        cart.setTotalQuantity(0);

        CartEntity entity = new CartEntity(cart);
        CartEntity savedEntity = cartRepository.save(entity);
        return savedEntity.toBusinessModel();
    }

    @Override
    public Cart addItemToGuestCart(String sessionId, CartItem cartItem) {
        Cart cart = createGuestCart(sessionId);
        cartItem.setCartId(cart.getId());
        
        CartItemEntity itemEntity = new CartItemEntity(cartItem);
        CartItemEntity savedItem = cartItemRepository.save(itemEntity);
        
        // Update cart totals
        recalculateCartTotals(cart.getId());
        
        // Return updated cart
        return cartRepository.findById(cart.getId())
                .map(CartEntity::toBusinessModel)
                .orElse(cart);
    }

    @Override
    public void clearGuestCart(String sessionId) {
        Optional<CartEntity> cartEntity = cartRepository.findBySessionId(sessionId);
        if (cartEntity.isPresent()) {
            // Delete all cart items
            cartItemRepository.deleteByCartId(cartEntity.get().getId());
            
            // Reset cart totals
            cartEntity.get().setTotalQuantity(0);
            cartEntity.get().setTotalPrice(BigDecimal.ZERO);
            cartRepository.save(cartEntity.get());
        }
    }

    @Override
    public Cart mergeGuestCartToUser(String sessionId, Long userId) {
        Optional<CartEntity> guestCartEntity = cartRepository.findBySessionId(sessionId);
        Optional<CartEntity> userCartEntity = cartRepository.findByUserId(userId);
        
        if (!guestCartEntity.isPresent()) {
            // No guest cart to merge
            return userCartEntity.map(CartEntity::toBusinessModel).orElse(null);
        }
        
        if (!userCartEntity.isPresent()) {
            // No user cart exists, convert guest cart to user cart
            guestCartEntity.get().setUserId(userId);
            guestCartEntity.get().setSessionId(null);
            CartEntity savedEntity = cartRepository.save(guestCartEntity.get());
            return savedEntity.toBusinessModel();
        }
        
        // Merge guest cart items into user cart
        List<CartItemEntity> guestItems = cartItemRepository.findByCartId(guestCartEntity.get().getId());
        for (CartItemEntity guestItem : guestItems) {
            // Check if item already exists in user cart
            Optional<CartItemEntity> existingItem = cartItemRepository.findByCartIdAndProductId(
                userCartEntity.get().getId(), guestItem.getProductId());
            
            if (existingItem.isPresent()) {
                // Update quantity
                existingItem.get().setQuantity(existingItem.get().getQuantity() + guestItem.getQuantity());
                cartItemRepository.save(existingItem.get());
            } else {
                // Add new item
                guestItem.setCartId(userCartEntity.get().getId());
                cartItemRepository.save(guestItem);
            }
        }
        
        // Delete guest cart
        cartItemRepository.deleteByCartId(guestCartEntity.get().getId());
        cartRepository.delete(guestCartEntity.get());
        
        // Update user cart totals
        recalculateCartTotals(userCartEntity.get().getId());
        
        return cartRepository.findById(userCartEntity.get().getId())
                .map(CartEntity::toBusinessModel)
                .orElse(null);
    }
}
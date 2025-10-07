package com.pecenio.backend.service;

import com.pecenio.businessmodel.entity.Cart;
import com.pecenio.businessmodel.entity.CartItem;
import java.util.Optional;

public interface CartService {
    
    Optional<Cart> getCartByUserId(Long userId);
    
    Optional<Cart> getCartBySessionId(String sessionId);
    
    Cart createCart(Long userId);
    
    Cart createGuestCart(String sessionId);
    
    Cart addItemToCart(Long userId, CartItem cartItem);
    
    Cart addItemToGuestCart(String sessionId, CartItem cartItem);
    
    Cart updateCartItem(Long itemId, CartItem cartItem);
    
    Cart removeCartItem(Long itemId);
    
    void clearCart(Long userId);
    
    void clearGuestCart(String sessionId);
    
    Cart mergeGuestCartToUser(String sessionId, Long userId);
}
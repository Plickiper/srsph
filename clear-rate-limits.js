// Quick script to clear rate limits for development
// Run this in your browser console or as a Node.js script

const clearRateLimits = async () => {
  try {
    const response = await fetch('http://localhost:8080/api/debug/clear-rate-limits', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    console.log('Rate limits cleared:', result);
  } catch (error) {
    console.error('Error clearing rate limits:', error);
  }
};

// Run the function
clearRateLimits();

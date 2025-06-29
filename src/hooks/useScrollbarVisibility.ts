import { useEffect } from 'react';

/**
 * Custom hook to manage auto-hiding scrollbars
 * Shows scrollbars when scrolling, hides them when scrolling stops
 */
export const useScrollbarVisibility = () => {
  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout;
    
    const handleScroll = () => {
      // Add scrolling class to show scrollbar
      document.documentElement.classList.add('scrolling');
      
      // Clear existing timeout
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      
      // Set timeout to hide scrollbar after scrolling stops
      scrollTimeout = setTimeout(() => {
        document.documentElement.classList.remove('scrolling');
      }, 150); // Hide after 150ms of no scrolling
    };

    const handleScrollableElements = () => {
      const scrollableElements = document.querySelectorAll('.overflow-y-auto, .overflow-auto, .overflow-x-auto');
      
      scrollableElements.forEach(element => {
        let elementScrollTimeout: NodeJS.Timeout;
        
        const handleElementScroll = () => {
          element.classList.add('scrolling');
          
          if (elementScrollTimeout) {
            clearTimeout(elementScrollTimeout);
          }
          
          elementScrollTimeout = setTimeout(() => {
            element.classList.remove('scrolling');
          }, 150);
        };
        
        element.addEventListener('scroll', handleElementScroll, { passive: true });
        
        // Cleanup function for each element
        return () => {
          element.removeEventListener('scroll', handleElementScroll);
          if (elementScrollTimeout) {
            clearTimeout(elementScrollTimeout);
          }
        };
      });
    };

    // Add scroll listener to window
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Handle scrollable elements
    handleScrollableElements();
    
    // Re-run when DOM changes (for dynamically added elements)
    const observer = new MutationObserver(handleScrollableElements);
    observer.observe(document.body, { 
      childList: true, 
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });

    // Cleanup
    return () => {
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      document.documentElement.classList.remove('scrolling');
    };
  }, []);
};
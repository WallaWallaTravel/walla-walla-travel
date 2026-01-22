/**
 * Walla Walla Travel - Embeddable Widgets
 * 
 * Include this script in your website to easily embed WWT widgets:
 * <script src="https://wallawalla.travel/embed/walla-widgets.js"></script>
 * 
 * Then add widgets using data attributes:
 * <div data-walla-widget="booking"></div>
 * <div data-walla-widget="directory" data-walla-category="winery"></div>
 * <div data-walla-widget="directory" data-walla-chat="true"></div>
 */

(function() {
  'use strict';

  const APP_URL = 'https://wallawalla.travel';
  
  // Default styles for widget containers
  const DEFAULT_STYLES = {
    booking: { minHeight: '500px', width: '100%' },
    directory: { minHeight: '400px', width: '100%' },
  };

  /**
   * Create an iframe for a widget
   */
  function createWidget(container, type, options = {}) {
    // Build URL with options
    const params = new URLSearchParams();
    
    if (options.provider) params.set('provider', options.provider);
    if (options.category) params.set('category', options.category);
    if (options.chat) params.set('chat', 'true');
    if (options.minimal) params.set('minimal', 'true');
    if (options.primaryColor) params.set('primaryColor', options.primaryColor);

    const url = `${APP_URL}/embed/${type}${params.toString() ? '?' + params.toString() : ''}`;

    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.style.border = 'none';
    iframe.style.width = '100%';
    iframe.style.minHeight = DEFAULT_STYLES[type]?.minHeight || '400px';
    iframe.style.display = 'block';
    iframe.setAttribute('allowtransparency', 'true');
    iframe.setAttribute('scrolling', 'no');
    
    // Handle auto-resize messages from iframe
    window.addEventListener('message', function(event) {
      if (event.data.type === 'walla-embed-resize' && iframe.contentWindow === event.source) {
        iframe.style.height = event.data.height + 'px';
      }
      
      // Forward other events to custom handlers
      if (event.data.type === 'walla-booking-submitted' && options.onBookingSubmit) {
        options.onBookingSubmit(event.data.data);
      }
      if (event.data.type === 'walla-directory-select' && options.onDirectorySelect) {
        options.onDirectorySelect(event.data.data);
      }
    });

    // Clear container and add iframe
    container.innerHTML = '';
    container.appendChild(iframe);

    return iframe;
  }

  /**
   * Initialize all widgets on the page
   */
  function initWidgets() {
    const widgets = document.querySelectorAll('[data-walla-widget]');
    
    widgets.forEach(function(container) {
      const type = container.getAttribute('data-walla-widget');
      
      if (!type || !['booking', 'directory'].includes(type)) {
        console.warn('Walla: Unknown widget type:', type);
        return;
      }

      const options = {
        provider: container.getAttribute('data-walla-provider'),
        category: container.getAttribute('data-walla-category'),
        chat: container.getAttribute('data-walla-chat') === 'true',
        minimal: container.getAttribute('data-walla-minimal') === 'true',
        primaryColor: container.getAttribute('data-walla-color'),
      };

      createWidget(container, type, options);
    });
  }

  // Expose API
  window.WallaWidgets = {
    create: createWidget,
    init: initWidgets,
  };

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidgets);
  } else {
    initWidgets();
  }

})();









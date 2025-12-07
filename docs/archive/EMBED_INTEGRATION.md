# Embedding Walla Walla Travel Widgets in Webflow

This guide explains how to embed app.wallawalla.travel widgets in your Webflow site.

## Quick Start

### Option 1: JavaScript SDK (Recommended)

Add the script to your Webflow site's `<head>` custom code:

```html
<script src="https://app.wallawalla.travel/embed/walla-widgets.js"></script>
```

Then add widgets anywhere on your pages using data attributes:

```html
<!-- Booking Widget -->
<div data-walla-widget="booking"></div>

<!-- Directory Widget -->
<div data-walla-widget="directory"></div>

<!-- Directory with Chat Mode -->
<div data-walla-widget="directory" data-walla-chat="true"></div>

<!-- Directory filtered to wineries only -->
<div data-walla-widget="directory" data-walla-category="winery"></div>
```

### Option 2: Direct Iframe

```html
<!-- Booking Widget -->
<iframe 
  src="https://app.wallawalla.travel/embed/booking" 
  style="width: 100%; min-height: 500px; border: none;"
></iframe>

<!-- Directory Widget -->
<iframe 
  src="https://app.wallawalla.travel/embed/directory" 
  style="width: 100%; min-height: 400px; border: none;"
></iframe>
```

## Widget Options

### Booking Widget

| Attribute | Description | Example |
|-----------|-------------|---------|
| `data-walla-provider` | Pre-select a tour provider | `nw-touring`, `herding-cats` |
| `data-walla-minimal` | Hide header | `true` |
| `data-walla-color` | Primary color (hex) | `#E07A5F` |

**Example:**
```html
<div 
  data-walla-widget="booking" 
  data-walla-provider="nw-touring"
  data-walla-color="#B87333"
></div>
```

### Directory Widget

| Attribute | Description | Example |
|-----------|-------------|---------|
| `data-walla-category` | Filter to category | `winery`, `restaurant`, `lodging`, `activity` |
| `data-walla-chat` | Enable AI chat mode | `true` |
| `data-walla-minimal` | Hide header | `true` |
| `data-walla-color` | Primary color (hex) | `#E07A5F` |

**Example:**
```html
<div 
  data-walla-widget="directory" 
  data-walla-category="winery"
  data-walla-chat="true"
></div>
```

## Webflow Setup Instructions

### 1. Add the Script

1. Go to your Webflow project settings
2. Click on "Custom Code" tab
3. In the "Head Code" section, paste:

```html
<script src="https://app.wallawalla.travel/embed/walla-widgets.js"></script>
```

4. Click "Save"

### 2. Add a Widget

1. Open the page where you want the widget
2. Add an "Embed" element from the Add panel
3. Click on the embed and enter one of the widget codes:

For booking:
```html
<div data-walla-widget="booking"></div>
```

For directory:
```html
<div data-walla-widget="directory"></div>
```

4. The widget will appear in your published site (not in the designer preview)

### 3. Style the Container

You can add a custom class to the embed element in Webflow to control:
- Width
- Max-width
- Margins/padding
- Border radius
- Box shadow

The iframe will automatically fill its container width.

## Events & Callbacks

If using the JavaScript SDK, you can listen for events:

```javascript
// Programmatic widget creation with callbacks
WallaWidgets.create(document.getElementById('my-booking'), 'booking', {
  onBookingSubmit: function(data) {
    console.log('Booking submitted:', data);
    // Track in analytics, show thank you message, etc.
  }
});

WallaWidgets.create(document.getElementById('my-directory'), 'directory', {
  onDirectorySelect: function(business) {
    console.log('Business selected:', business);
    // Open in new tab, show modal, etc.
  }
});
```

## URL Parameters (for iframes)

If using direct iframes, append these query parameters:

| Parameter | Description |
|-----------|-------------|
| `?provider=nw-touring` | Pre-select provider |
| `?category=winery` | Filter category |
| `?chat=true` | Enable chat mode |
| `?minimal=true` | Hide header |
| `?primaryColor=%23E07A5F` | Custom color (URL-encoded hex) |

**Example:**
```html
<iframe src="https://app.wallawalla.travel/embed/booking?provider=nw-touring&minimal=true"></iframe>
```

## Troubleshooting

### Widget not appearing
- Make sure the script is loaded (check browser console)
- Publish the Webflow site (widgets don't render in designer preview)
- Check that the `data-walla-widget` attribute is spelled correctly

### Widget too small
- Add min-height to the embed container in Webflow
- The iframe will try to auto-resize, but needs initial space

### Styling conflicts
- The widgets are isolated in iframes, so your site CSS won't affect them
- Use the `primaryColor` option to match your site's color scheme

## Support

Questions? Contact us at support@wallawalla.travel


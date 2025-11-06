# 📸 Media Framework - Photos & Videos for Proposals & Itineraries

## Overview:

Create a centralized media library that automatically enhances proposals and client portal itineraries with beautiful photos and videos.

---

## 1. Media Library Structure

### **Directory Structure:**
```
/public/media/
├── wineries/
│   ├── lecole-no-41/
│   │   ├── hero.jpg
│   │   ├── tasting-room.jpg
│   │   ├── vineyard.jpg
│   │   ├── bottles.jpg
│   │   └── video-tour.mp4
│   ├── leonetti-cellar/
│   │   ├── hero.jpg
│   │   ├── exterior.jpg
│   │   └── ...
│   └── ...
├── services/
│   ├── wine-tours/
│   │   ├── hero.jpg
│   │   ├── van-interior.jpg
│   │   ├── group-tasting.jpg
│   │   └── tour-video.mp4
│   ├── airport-transfers/
│   │   ├── mercedes-sprinter.jpg
│   │   ├── luxury-interior.jpg
│   │   └── ...
│   └── wait-time/
│       └── ...
├── locations/
│   ├── walla-walla/
│   │   ├── downtown.jpg
│   │   ├── vineyards-aerial.jpg
│   │   └── sunset.jpg
│   └── ...
├── vehicles/
│   ├── sprinter-van-11.jpg
│   ├── sprinter-van-14.jpg
│   ├── interior-luxury.jpg
│   └── ...
└── brand/
    ├── logo.png
    ├── logo-white.png
    ├── hero-banner.jpg
    └── ...
```

---

## 2. Database Schema

### **Media Library Table:**
```sql
CREATE TABLE media_library (
  id SERIAL PRIMARY KEY,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_type VARCHAR(50) NOT NULL, -- 'image' or 'video'
  file_size INTEGER,
  mime_type VARCHAR(100),
  
  -- Categorization
  category VARCHAR(100) NOT NULL, -- 'winery', 'service', 'vehicle', 'location', 'brand'
  subcategory VARCHAR(100), -- Specific winery name, service type, etc.
  
  -- Metadata
  title VARCHAR(255),
  description TEXT,
  alt_text VARCHAR(255),
  photographer VARCHAR(255),
  
  -- Tags for smart matching
  tags TEXT[], -- ['wine', 'tasting', 'red-wine', 'outdoor', 'summer']
  
  -- Usage tracking
  is_hero BOOLEAN DEFAULT FALSE, -- Featured/hero image
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- SEO
  seo_keywords TEXT[],
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX idx_media_category ON media_library(category);
CREATE INDEX idx_media_subcategory ON media_library(subcategory);
CREATE INDEX idx_media_tags ON media_library USING GIN(tags);
CREATE INDEX idx_media_active ON media_library(is_active);
```

### **Link Media to Entities:**
```sql
-- Link wineries to their media
CREATE TABLE winery_media (
  id SERIAL PRIMARY KEY,
  winery_id INTEGER REFERENCES wineries(id),
  media_id INTEGER REFERENCES media_library(id),
  display_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Link proposals to custom media
CREATE TABLE proposal_media (
  id SERIAL PRIMARY KEY,
  proposal_id INTEGER REFERENCES proposals(id),
  media_id INTEGER REFERENCES media_library(id),
  section VARCHAR(100), -- 'hero', 'gallery', 'service_1', 'service_2'
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 3. Auto-Linking Logic

### **Smart Media Matching:**

```typescript
// lib/media-matcher.ts

interface MediaSuggestion {
  media_id: number;
  file_path: string;
  title: string;
  relevance_score: number;
  reason: string;
}

/**
 * Get suggested media for a winery
 */
async function getWineryMedia(wineryId: number): Promise<Media[]> {
  // 1. Direct winery media (winery_media table)
  // 2. Fallback to category media (wineries/general)
  // 3. Fallback to location media (walla-walla)
}

/**
 * Get suggested media for a service type
 */
async function getServiceMedia(serviceType: string): Promise<Media[]> {
  // Match: services/{serviceType}/*
  // Fallback: services/general/*
}

/**
 * Auto-suggest media for proposal
 */
async function suggestProposalMedia(proposal: Proposal): Promise<MediaSuggestion[]> {
  const suggestions: MediaSuggestion[] = [];
  
  // 1. Hero image based on primary service
  // 2. Service-specific images
  // 3. Winery images for each selected winery
  // 4. Vehicle images
  // 5. Location/lifestyle images
  
  return suggestions.sort((a, b) => b.relevance_score - a.relevance_score);
}
```

---

## 4. Proposal Media Integration

### **Proposal Structure with Media:**

```typescript
interface ProposalWithMedia {
  // ... existing proposal fields ...
  
  media: {
    hero_image?: string;
    hero_video?: string;
    
    service_images: {
      [service_id: string]: string[]; // Array of image URLs
    };
    
    winery_images: {
      [winery_id: number]: {
        hero: string;
        gallery: string[];
      };
    };
    
    vehicle_images: string[];
    
    lifestyle_gallery: string[]; // General Walla Walla lifestyle
  };
}
```

### **Proposal UI with Media:**

```
┌─────────────────────────────────────────────────────────┐
│ [HERO IMAGE - Full width, 600px height]                 │
│                                                          │
│ Walla Walla Wine Country Experience                     │
│ Prepared for: John Smith                                │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Your Personalized Itinerary                              │
│                                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ [Service Image]  Wine Tour - June 15, 2025         │ │
│ │                  6 hours | 6 guests                 │ │
│ │                  $1,089.00                          │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ Featured Wineries:                                       │
│ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐  │
│ │ [Winery Img]  │ │ [Winery Img]  │ │ [Winery Img]  │  │
│ │ L'Ecole No 41 │ │ Leonetti      │ │ Woodward      │  │
│ └───────────────┘ └───────────────┘ └───────────────┘  │
│                                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ [Transfer Img]   Airport Transfer - June 15         │ │
│ │                  SeaTac → Walla Walla               │ │
│ │                  $350.00                            │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Gallery                                                  │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐            │
│ │ [Img]  │ │ [Img]  │ │ [Img]  │ │ [Img]  │            │
│ └────────┘ └────────┘ └────────┘ └────────┘            │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Client Portal Itinerary Integration

### **Enhanced Itinerary with Photos:**

```
┌─────────────────────────────────────────────────────────┐
│ Your Walla Walla Wine Tour                               │
│ June 15, 2025                                            │
│                                                          │
│ [HERO IMAGE - Walla Walla vineyards at sunset]          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 10:00 AM - L'Ecole No 41                                │
│                                                          │
│ ┌──────────────────────┐                                │
│ │                      │  Historic Frenchtown           │
│ │   [Winery Photo]     │  Schoolhouse                   │
│ │                      │                                │
│ │                      │  Known for: Bordeaux blends,   │
│ └──────────────────────┘  Syrah, Semillon              │
│                                                          │
│ 📍 41 Lowden School Rd, Walla Walla                     │
│ 🍷 Tasting Fee: $15 (waived with purchase)              │
│                                                          │
│ [View Gallery →] [Watch Video →]                        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 12:00 PM - Leonetti Cellar                              │
│                                                          │
│ ┌──────────────────────┐                                │
│ │                      │  Legendary Walla Walla         │
│ │   [Winery Photo]     │  Producer                      │
│ │                      │                                │
│ │                      │  Known for: Cabernet, Merlot   │
│ └──────────────────────┘  Sangiovese                    │
│                                                          │
│ 📍 1875 Foothills Ln, Walla Walla                       │
│ 🍷 By appointment only                                   │
│                                                          │
│ [View Gallery →]                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 6. Admin Media Management Interface

### **Media Library Dashboard:**

```
┌─────────────────────────────────────────────────────────┐
│ Media Library                                            │
│                                                          │
│ [+ Upload Media] [Bulk Upload] [Import from URL]        │
│                                                          │
│ Filters:                                                 │
│ Category: [All ▼] Type: [All ▼] Tags: [________]       │
│                                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Wineries (145 items)                                │ │
│ │ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐        │ │
│ │ │ [Img]  │ │ [Img]  │ │ [Img]  │ │ [Img]  │        │ │
│ │ │L'Ecole │ │Leonetti│ │Woodward│ │ [+Add] │        │ │
│ │ └────────┘ └────────┘ └────────┘ └────────┘        │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Services (32 items)                                 │ │
│ │ ┌────────┐ ┌────────┐ ┌────────┐                   │ │
│ │ │ [Img]  │ │ [Img]  │ │ [Img]  │                   │ │
│ │ │Tours   │ │Transfer│ │Airport │                   │ │
│ │ └────────┘ └────────┘ └────────┘                   │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### **Upload Interface:**

```
┌─────────────────────────────────────────────────────────┐
│ Upload Media                                             │
│                                                          │
│ [Drag & Drop Files Here]                                │
│ or [Browse Files]                                        │
│                                                          │
│ Category: [Winery ▼]                                    │
│ Subcategory: [L'Ecole No 41 ▼]                         │
│                                                          │
│ Title: [Tasting Room Interior_________________]         │
│ Description: [Beautiful tasting room with...___]        │
│ Alt Text: [L'Ecole No 41 tasting room_______]          │
│                                                          │
│ Tags: [wine] [tasting-room] [interior] [+Add Tag]      │
│                                                          │
│ ☑ Set as hero image                                    │
│ ☐ Set as primary for this winery                       │
│                                                          │
│ [Cancel] [Upload]                                       │
└─────────────────────────────────────────────────────────┘
```

---

## 7. Auto-Linking in Proposal Builder

### **When Admin Creates Proposal:**

```
┌─────────────────────────────────────────────────────────┐
│ Step 3: Media & Presentation                             │
│                                                          │
│ Hero Image:                                              │
│ ┌────────────────────────────────────────────────────┐  │
│ │ [Current Hero Image Preview]                       │  │
│ │                                                     │  │
│ │ [Change Hero Image]                                │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ ✨ Suggested Media (Auto-selected based on services):   │
│                                                          │
│ Service Images:                                          │
│ ☑ Wine Tour: [walla-walla-vineyard.jpg]                │
│ ☑ Airport Transfer: [mercedes-sprinter.jpg]            │
│                                                          │
│ Winery Images:                                           │
│ ☑ L'Ecole No 41: [hero.jpg] + 3 gallery images         │
│ ☑ Leonetti Cellar: [hero.jpg] + 2 gallery images       │
│ ☑ Woodward Canyon: [hero.jpg] + 4 gallery images       │
│                                                          │
│ Lifestyle Gallery:                                       │
│ ☑ Walla Walla downtown sunset                          │
│ ☑ Vineyard aerial view                                  │
│ ☑ Wine glasses at sunset                                │
│                                                          │
│ [Customize Media] [Use All Suggested]                   │
└─────────────────────────────────────────────────────────┘
```

---

## 8. Implementation Files

### **File Structure:**
```
/app/admin/media/
├── page.tsx                    # Media library dashboard
├── upload/page.tsx             # Upload interface
└── [media_id]/edit/page.tsx    # Edit media details

/app/api/media/
├── route.ts                    # List/search media
├── upload/route.ts             # Upload handler
├── [media_id]/route.ts         # Get/update/delete
└── suggest/route.ts            # Auto-suggest for proposals

/lib/
├── media-matcher.ts            # Smart matching logic
├── media-uploader.ts           # Upload utilities
└── media-optimizer.ts          # Image optimization

/components/media/
├── MediaGallery.tsx            # Display gallery
├── MediaPicker.tsx             # Select media
├── MediaUploader.tsx           # Upload component
└── MediaCard.tsx               # Single media item
```

---

## 9. Media Optimization

### **Automatic Processing:**
- **Resize:** Generate multiple sizes (thumbnail, medium, large, original)
- **Compress:** Optimize file size without quality loss
- **Format:** Convert to WebP for web, keep original
- **CDN:** Optional CloudFlare/AWS integration

### **Sizes Generated:**
```
original.jpg     → 2400x1600 (original)
large.jpg        → 1920x1280 (hero images)
medium.jpg       → 1200x800  (service images)
thumbnail.jpg    → 400x300   (gallery thumbnails)
original.webp    → WebP version for modern browsers
```

---

## 10. Video Support

### **Video Handling:**
- Upload to `/public/media/videos/`
- Generate thumbnail from first frame
- Support: MP4, WebM
- Optional: YouTube/Vimeo embed support

### **Video in Proposals:**
```html
<video controls poster="thumbnail.jpg">
  <source src="/media/videos/winery-tour.mp4" type="video/mp4">
  <source src="/media/videos/winery-tour.webm" type="video/webm">
</video>
```

---

## 11. Benefits

✅ **Professional Proposals** - Beautiful, photo-rich presentations  
✅ **Auto-Enhancement** - Smart suggestions save time  
✅ **Consistent Branding** - Centralized media library  
✅ **Client Experience** - Immersive itineraries with photos  
✅ **Easy Management** - Upload once, use everywhere  
✅ **SEO Friendly** - Proper alt text, metadata  
✅ **Scalable** - Add media as you grow  

---

## 12. Migration Path

### **Phase 1: Database & Structure**
1. Create media_library table
2. Create winery_media, proposal_media tables
3. Set up directory structure

### **Phase 2: Admin Interface**
1. Media library dashboard
2. Upload interface
3. Edit/manage media

### **Phase 3: Auto-Linking**
1. Smart matching algorithm
2. Suggestion engine
3. Proposal builder integration

### **Phase 4: Client Portal**
1. Enhanced itineraries with photos
2. Winery galleries
3. Video integration

---

**Ready to implement this comprehensive media framework!** 📸🎥

This will make your proposals and client portal truly stand out with professional, engaging visual content.


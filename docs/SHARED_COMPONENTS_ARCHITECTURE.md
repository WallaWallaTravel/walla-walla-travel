# 🏗️ Shared Components Architecture

## 📋 Overview

This document outlines the architecture for **reusable, intelligent form components** that will be used across the entire Walla Walla Travel application. These components ensure consistency, reduce code duplication, and make maintenance significantly easier.

---

## 🎯 Goals

1. **DRY Principle**: Write once, use everywhere
2. **Consistency**: Same UX across all forms (proposals, bookings, itineraries, admin)
3. **Maintainability**: Update logic in one place, affects all instances
4. **Type Safety**: Full TypeScript support with proper interfaces
5. **Accessibility**: WCAG 2.1 AA compliant
6. **Performance**: Optimized with React best practices

---

## 📦 Component Library Structure

```
/Users/temp/walla-walla-final/
├── components/
│   └── shared/
│       ├── form-inputs/
│       │   ├── SmartTimeInput.tsx          ⭐ NEW
│       │   ├── WinerySelector.tsx          ⭐ MOVE FROM PROPOSALS
│       │   ├── ServiceTypeSelector.tsx     ⭐ NEW
│       │   ├── PartyCountInput.tsx         ⭐ NEW
│       │   ├── DurationInput.tsx           ⭐ NEW
│       │   ├── PricingOverride.tsx         ⭐ NEW
│       │   ├── DateRangePicker.tsx         ⭐ NEW
│       │   └── LocationInput.tsx           ⭐ NEW
│       │
│       ├── service-builders/
│       │   ├── ServiceItemCard.tsx         ⭐ NEW (Refactored from proposals)
│       │   ├── ServiceItemList.tsx         ⭐ NEW
│       │   └── PricingSummary.tsx          ⭐ NEW
│       │
│       └── utils/
│           ├── timeParser.ts               ⭐ NEW (Smart time parsing logic)
│           ├── serviceTypes.ts             ⭐ NEW (Service type definitions)
│           └── formValidation.ts           ⭐ NEW (Shared validation)
│
├── lib/
│   └── hooks/
│       ├── useSmartTimeInput.ts            ⭐ NEW
│       ├── useWinerySelection.ts           ⭐ NEW
│       └── useServiceBuilder.ts            ⭐ NEW
│
└── types/
    └── shared/
        ├── service-items.ts                ⭐ NEW (Common interfaces)
        ├── form-inputs.ts                  ⭐ NEW
        └── pricing.ts                      ⭐ NEW
```

---

## 🧩 Core Shared Components

### 1. **SmartTimeInput** ⭐ Priority #1

**Purpose:** Ultra-fast time entry with intelligent AM/PM detection

**Features:**
- Parse `115` → `01:15 PM`
- Parse `930` → `09:30 AM`
- Service-type-aware defaults (wine tours vs transfers)
- Keyboard shortcuts (`a`/`p` to toggle AM/PM)
- Live preview as you type
- Tab/Enter to confirm and move to next field

**Props:**
```typescript
interface SmartTimeInputProps {
  value: string;                          // ISO time string or HH:MM format
  onChange: (time: string) => void;
  serviceType?: 'wine_tour' | 'transfer' | 'wait_time' | 'custom';
  label?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  nextFieldId?: string;                   // Auto-focus after Enter
  className?: string;
}
```

**Usage:**
```tsx
// In Proposal Builder
<SmartTimeInput
  value={item.start_time}
  onChange={(time) => onUpdate({ start_time: time })}
  serviceType="wine_tour"
  label="Start Time"
  nextFieldId={`duration-${item.id}`}
/>

// In Booking System
<SmartTimeInput
  value={booking.pickup_time}
  onChange={(time) => setBooking({ ...booking, pickup_time: time })}
  serviceType="transfer"
  label="Pickup Time"
/>

// In Itinerary Builder
<SmartTimeInput
  value={activity.start_time}
  onChange={(time) => updateActivity(activity.id, { start_time: time })}
  label="Activity Start"
/>
```

---

### 2. **WinerySelector** ⭐ Priority #2

**Purpose:** Fast winery selection with search, keyboard shortcuts, and smart focus

**Features:**
- Real-time search filtering
- Enter key to select when 1 result
- Auto-clear and refocus after selection
- Auto-advance to next field after 3rd selection
- Visual "Selected Wineries" section
- Drag-to-reorder (future enhancement)

**Props:**
```typescript
interface WinerySelectorProps {
  selectedWineries: Winery[];
  allWineries: Winery[];
  onUpdate: (wineries: Winery[]) => void;
  maxSelections?: number;                 // Default: unlimited
  minSelections?: number;                 // Default: 0
  nextFieldId?: string;                   // Focus after max reached
  label?: string;
  error?: string;
  className?: string;
}

interface Winery {
  id: number;
  name: string;
  city: string;
  region?: string;
}
```

**Usage:**
```tsx
// In Proposal Builder (already implemented)
<WinerySelector
  selectedWineries={item.selected_wineries || []}
  allWineries={wineries}
  onUpdate={(selected) => onUpdate({ selected_wineries: selected })}
  maxSelections={5}
  nextFieldId={`description-${item.id}`}
/>

// In Itinerary Builder
<WinerySelector
  selectedWineries={day.wineries}
  allWineries={allWineries}
  onUpdate={(wineries) => updateDay(day.id, { wineries })}
  label="Wineries for Day 2"
/>

// In Booking System
<WinerySelector
  selectedWineries={booking.wineries}
  allWineries={availableWineries}
  onUpdate={(wineries) => setBooking({ ...booking, wineries })}
  minSelections={2}
  maxSelections={4}
/>
```

---

### 3. **ServiceTypeSelector** ⭐ Priority #3

**Purpose:** Consistent service type selection across all builders

**Features:**
- Visual card-based selection
- Icons for each service type
- Conditional rendering based on context
- Quick-add buttons

**Props:**
```typescript
interface ServiceTypeSelectorProps {
  onSelect: (serviceType: ServiceType) => void;
  availableTypes?: ServiceType[];         // Filter which types to show
  layout?: 'grid' | 'list';
  showDescriptions?: boolean;
  className?: string;
}

type ServiceType = 
  | 'wine_tour' 
  | 'airport_transfer' 
  | 'local_transfer' 
  | 'regional_transfer' 
  | 'wait_time' 
  | 'custom';
```

---

### 4. **DurationInput** ⭐ Priority #4

**Purpose:** Flexible duration entry (hours, half-hours, quarter-hours)

**Features:**
- Manual number input (e.g., `6.5`, `5.75`)
- Quick-select buttons (5h, 5.5h, 6h, 6.5h)
- Service-type-aware defaults
- Min/max validation

**Props:**
```typescript
interface DurationInputProps {
  value: number;                          // Hours as decimal
  onChange: (hours: number) => void;
  serviceType?: ServiceType;
  min?: number;                           // Default: 0.5
  max?: number;                           // Default: 12
  step?: number;                          // Default: 0.25
  quickOptions?: number[];                // Default: [5, 5.5, 6, 6.5]
  label?: string;
  error?: string;
  className?: string;
}
```

---

### 5. **PricingOverride** ⭐ Priority #5

**Purpose:** Consistent pricing override UI across all builders

**Features:**
- Hourly vs Fixed pricing toggle
- Custom rate inputs
- Override reason tracking
- Visual price comparison
- Auto-calculation

**Props:**
```typescript
interface PricingOverrideProps {
  serviceItem: ServiceItem;
  standardPrice: number;
  onUpdate: (override: PricingOverride) => void;
  allowHourly?: boolean;
  allowFixed?: boolean;
  className?: string;
}

interface PricingOverride {
  enabled: boolean;
  pricing_mode: 'hourly' | 'fixed';
  custom_hourly_rate?: number;
  custom_total?: number;
  override_reason?: string;
}
```

---

## 🔧 Utility Functions & Hooks

### **timeParser.ts** - Smart Time Parsing Logic

```typescript
export interface TimeParseOptions {
  serviceType?: ServiceType;
  defaultPeriod?: 'AM' | 'PM';
}

export interface ParsedTime {
  hours: number;                          // 1-12
  minutes: number;                        // 0-59
  period: 'AM' | 'PM';
  formatted: string;                      // "01:15 PM"
  iso: string;                            // "13:15:00"
}

/**
 * Parse various time input formats into structured time
 * Examples:
 *   parseTime('115', { serviceType: 'wine_tour' }) → 01:15 PM
 *   parseTime('930', { serviceType: 'transfer' }) → 09:30 AM
 *   parseTime('7', { serviceType: 'wine_tour' }) → 07:00 PM (rare early pickup)
 */
export function parseTime(input: string, options?: TimeParseOptions): ParsedTime | null;

/**
 * Determine smart AM/PM based on service type and hour
 */
export function determineSmartPeriod(
  hour: number, 
  serviceType?: ServiceType
): 'AM' | 'PM';

/**
 * Format time for display
 */
export function formatTime(time: ParsedTime): string;

/**
 * Convert to 24-hour format for database storage
 */
export function toISO(time: ParsedTime): string;
```

**Smart Period Logic:**

```typescript
// Wine Tours (9am-6pm typical)
if (serviceType === 'wine_tour') {
  if (hour >= 9 && hour <= 11) return 'AM';
  if (hour >= 12 || hour <= 6) return 'PM';
  if (hour >= 7 && hour <= 8) return 'PM';  // Rare but possible
}

// Transfers (wider range: 5am-11pm)
if (serviceType === 'transfer' || serviceType === 'airport_transfer') {
  if (hour >= 5 && hour <= 11) return 'AM';
  if (hour === 12 || (hour >= 1 && hour <= 11)) return 'PM';
}

// Wait Time / Custom (business hours default)
if (hour >= 8 && hour <= 11) return 'AM';
return 'PM';
```

---

### **useSmartTimeInput.ts** - Time Input Hook

```typescript
export function useSmartTimeInput(
  initialValue: string,
  serviceType?: ServiceType
) {
  const [rawInput, setRawInput] = useState('');
  const [parsedTime, setParsedTime] = useState<ParsedTime | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleInput = (input: string) => {
    // Parse and validate
    const parsed = parseTime(input, { serviceType });
    if (parsed) {
      setParsedTime(parsed);
      setError(null);
    } else {
      setError('Invalid time format');
    }
    setRawInput(input);
  };

  const togglePeriod = () => {
    if (parsedTime) {
      setParsedTime({
        ...parsedTime,
        period: parsedTime.period === 'AM' ? 'PM' : 'AM'
      });
    }
  };

  return {
    rawInput,
    parsedTime,
    error,
    handleInput,
    togglePeriod,
    formattedTime: parsedTime ? formatTime(parsedTime) : '',
    isoTime: parsedTime ? toISO(parsedTime) : ''
  };
}
```

---

### **useWinerySelection.ts** - Winery Selection Hook

```typescript
export function useWinerySelection(
  initialWineries: Winery[],
  maxSelections?: number
) {
  const [selected, setSelected] = useState<Winery[]>(initialWineries);
  const [searchTerm, setSearchTerm] = useState('');

  const toggle = (winery: Winery) => {
    if (isSelected(winery)) {
      setSelected(selected.filter(w => w.id !== winery.id));
    } else if (!maxSelections || selected.length < maxSelections) {
      setSelected([...selected, winery]);
    }
  };

  const isSelected = (winery: Winery) => 
    selected.some(w => w.id === winery.id);

  const clear = () => setSelected([]);

  const reorder = (fromIndex: number, toIndex: number) => {
    const newSelected = [...selected];
    const [moved] = newSelected.splice(fromIndex, 1);
    newSelected.splice(toIndex, 0, moved);
    setSelected(newSelected);
  };

  return {
    selected,
    searchTerm,
    setSearchTerm,
    toggle,
    isSelected,
    clear,
    reorder,
    canAddMore: !maxSelections || selected.length < maxSelections,
    remaining: maxSelections ? maxSelections - selected.length : Infinity
  };
}
```

---

## 🔒 Public vs. Private Usage Strategy

### **Strategic Decision: Internal-First Approach**

These shared components are being built for **internal use** across:
- Admin proposal builder
- Admin booking management
- Admin itinerary builder
- Client portal (view-only for booked clients)

### **Future Consideration: Public Itinerary Planner**

A public-facing itinerary builder could be offered on WallaWalla.Travel, but requires careful consideration:

**Risks:**
- Competitor intelligence gathering
- Self-service cannibalization (clients DIY instead of booking)
- Devaluation of expertise

**Mitigation Strategies (if implemented):**
- Limited feature set (winery names only, no detailed routes)
- No reservation booking capabilities
- Email gate for lead capture
- Heavy "Book a Driver" conversion focus
- Business email detection (show different version to competitors)

**Recommendation:** Build for internal use first, gather data, then decide on public access with safeguards.

---

## 📍 Where These Components Will Be Used

### **Proposal Builder** (`/app/admin/proposals/new/page.tsx`)
- ✅ WinerySelector (already implemented)
- 🔄 SmartTimeInput (replace current time inputs)
- 🔄 DurationInput (replace current duration input)
- ✅ PricingOverride (already implemented)
- 🔄 ServiceTypeSelector (refactor existing cards)

### **Booking System** (`/app/book-tour/`)
- 🆕 SmartTimeInput (pickup/dropoff times)
- 🆕 WinerySelector (winery selection step)
- 🆕 DurationInput (tour duration)
- 🆕 ServiceTypeSelector (service selection)

### **Itinerary Builder** (`/app/itinerary-builder/`)
- 🆕 SmartTimeInput (activity start/end times)
- 🆕 WinerySelector (daily winery selection)
- 🆕 DurationInput (activity durations)
- 🆕 ServiceItemCard (activity cards)

### **Admin Booking Management** (`/app/admin/bookings/`)
- 🆕 SmartTimeInput (manual booking times)
- 🆕 WinerySelector (winery assignment)
- 🆕 ServiceTypeSelector (service type selection)

### **Driver Portal** (`/app/driver-portal/`)
- 🆕 SmartTimeInput (clock in/out, break times)
- 🆕 LocationInput (pickup/dropoff locations)

### **Client Portal** (`/app/client-portal/`)
- 🆕 SmartTimeInput (lunch order times)
- 🆕 WinerySelector (view/modify winery preferences)

---

## 🎨 Design System Integration

All shared components will follow the established design patterns:

### **Color Palette:**
```css
--primary: #8B1538;           /* Burgundy */
--primary-light: #FDF2F4;     /* Light pink background */
--accent: #D4AF37;            /* Gold */
--accent-light: #FAF6ED;      /* Light gold background */
--gray-50: #F9FAFB;
--gray-200: #E5E7EB;
--gray-300: #D1D5DB;
--gray-700: #374151;
--gray-900: #111827;
```

### **Subsection Box Pattern:**
```css
.subsection-box {
  background: #F9FAFB;        /* bg-gray-50 */
  border: 1px solid #E5E7EB;  /* border-gray-200 */
  border-radius: 0.5rem;      /* rounded-lg */
  padding: 1rem;              /* p-4 */
}
```

### **Focus States:**
```css
.input-focus {
  border-color: #8B1538;      /* focus:border-[#8B1538] */
  ring: 4px #FDF2F4;          /* focus:ring-4 focus:ring-[#FDF2F4] */
}
```

---

## 🚀 Implementation Phases

### **Phase 1: Core Time Input** (Highest Priority)
1. Create `timeParser.ts` utility
2. Create `useSmartTimeInput.ts` hook
3. Build `SmartTimeInput.tsx` component
4. Test with wine tours and transfers
5. Document usage patterns

### **Phase 2: Refactor Existing Components**
1. Move `WinerySelector` to `/components/shared/form-inputs/`
2. Extract `ServiceItemCard` from proposal builder
3. Create shared `PricingSummary` component
4. Update proposal builder to use shared components

### **Phase 3: Expand to Other Builders**
1. Integrate into booking system
2. Integrate into itinerary builder
3. Integrate into admin booking management

### **Phase 4: Advanced Features**
1. Add drag-to-reorder for wineries
2. Add autocomplete for locations
3. Add smart validation messages
4. Add accessibility improvements (ARIA labels, keyboard nav)

---

## 🧪 Testing Strategy

### **Unit Tests** (Jest)
- Time parsing logic (`timeParser.test.ts`)
- Winery selection logic (`useWinerySelection.test.ts`)
- Validation functions

### **Component Tests** (React Testing Library)
- SmartTimeInput interactions
- WinerySelector search and selection
- Keyboard shortcuts

### **Integration Tests**
- Full proposal creation flow
- Full booking creation flow
- Cross-component interactions

### **E2E Tests** (Playwright - Future)
- Complete user journeys
- Visual regression testing

---

## 📊 Success Metrics

1. **Code Reduction:** 60-70% less duplicated form code
2. **Consistency:** 100% UI/UX consistency across all forms
3. **Speed:** 50% faster data entry with keyboard shortcuts
4. **Maintainability:** Single source of truth for form logic
5. **Type Safety:** Zero TypeScript errors in form components

---

## 🔄 Migration Strategy

### **Approach: Gradual, Non-Breaking**

1. **Create shared components** alongside existing code
2. **Migrate one form at a time** (proposal builder first)
3. **Test thoroughly** before moving to next form
4. **Keep old code** until all migrations complete
5. **Clean up** old components after verification

### **Rollback Plan:**
- All shared components are opt-in
- Old components remain functional during migration
- Can revert individual forms if issues arise

---

## 📝 Documentation Requirements

Each shared component will have:
1. **README.md** with usage examples
2. **Storybook stories** (future enhancement)
3. **TypeScript interfaces** with JSDoc comments
4. **Inline code comments** for complex logic
5. **Migration guide** for updating existing forms

---

## 🎯 Next Steps

1. **Review this architecture** with stakeholder (you!)
2. **Get approval** on approach and priorities
3. **Start Phase 1** (SmartTimeInput)
4. **Iterate based on feedback**
5. **Expand to all forms systematically**

---

## 💡 Benefits Summary

| Benefit | Before | After |
|---------|--------|-------|
| **Time Entry** | 15-20 seconds (dropdowns) | 3-5 seconds (type `115` + Enter) |
| **Winery Selection** | 20 seconds (scroll, click, repeat) | 5 seconds (search + Enter x3) |
| **Code Duplication** | 5+ copies of similar forms | 1 shared component library |
| **Maintenance** | Update 5+ files for one change | Update 1 file, affects all |
| **Consistency** | Varies by form | 100% consistent UX |
| **Type Safety** | Partial, inconsistent | Full TypeScript coverage |
| **Testing** | Test each form separately | Test once, confidence everywhere |

---

**This architecture sets us up for long-term success with minimal technical debt!** 🎉


# BoundaryAI Design Rationale

Every design decision in `design.md` has a documented reason. This file provides the "why" behind each choice.

---

## Color Theme Decisions

| Decision | Choice | Reason | Source |
|----------|--------|--------|--------|
| Login/Dashboard background | Light (#ffffff, #f8fafc) | Indian government portals (Aadhaar, UMANG, DigiLocker) use light themes. Light backgrounds convey trust, transparency, and official authority. | GIGW Guidelines, Aadhaar Brand Guidelines |
| Map Editor sidebar | Dark (#111827) | Professional GIS applications (QGIS, ArcGIS Pro) use dark themes for map editing to reduce eye strain when viewing satellite imagery for extended periods. Reduces glare and visual competition with map content. | ArcGIS Pro Documentation, QGIS Night Mapping theme |
| Primary color | Navy Blue (#1e40af) | Blue is universally recognized for government and corporate trust. Associated with knowledge, loyalty, justice, and stability. Used across Indian government digital platforms. | GIGW Guidelines, Color Psychology Research |
| Avoid pure black | Use #111827 instead of #000000 | Pure black (#000000) overpowers surrounding elements and causes eye strain on digital displays. Deep gray provides same visual authority with better comfort. | GIGW Guidelines Section on Colors |
| Avoid pure white text on dark | Use #f3f4f6 instead of #ffffff | Reduces halation (light bleeding) effect that causes blur for users with astigmatism (~47% of glasses wearers). | Vision Research, Level Access Accessibility |
| Error color | Red (#dc2626) | Universal convention for errors. Combined with text messages (not color alone) per WCAG guidelines. | WCAG 2.1, GIGW Guidelines |
| Success color | Green (#059669) | Universal convention for success/completion. | Color Psychology Research |
| Warning color | Amber (#d97706) | Distinct from red (error) and green (success). Visible to colorblind users. | ColorBrewer, Accessibility Research |

---

## Parcel Type Colors

| Type | Color | Reason | Source |
|------|-------|--------|--------|
| Agricultural | Orange (#ea580c) | Standard cadastral convention - warm earth tones for farmland | GIS Manual Color Conventions, California Assessors' Handbook |
| Residential (Gramakantam) | Yellow (#ca8a04) | Standard convention since 1950s - yellow for residential across North America and internationally | GIS Manual Color Conventions |
| Building | Red (#dc2626) | Standard convention - red/orange for commercial/built structures | Cadastral Mapping Standards |
| Road | Gray (#6b7280) | Standard convention - gray/black for infrastructure and transportation | GIS Manual Color Conventions |
| Water Body | Blue (#2563eb) | Universal association - blue for water features | Cartographic Convention |
| Open Space | Green (#16a34a) | Universal association - green for vegetation, parks, natural areas | GIS Manual Color Conventions |
| Compound | Purple (#9333ea) | Distinct from other categories, used for mixed-use or special parcels | ColorBrewer Qualitative Palette |
| Government Land | Teal (#0d9488) | Blue family (institutional) but distinct from water bodies | Cadastral Mapping Standards |

---

## Accessibility Decisions

| Decision | Choice | Reason | Source |
|----------|--------|--------|--------|
| Contrast ratio | Minimum 4.5:1 | WCAG 2.1 Level AA requirement. GIGW mandates this for all Indian government websites. | WCAG 2.1, GIGW Guidelines |
| No red-green only differentiation | Always add secondary cue | ~8% of men have red-green colorblindness. Information must be conveyed through multiple means. | GIGW Guidelines, Accessibility Research |
| Touch target size | Minimum 44x44px | WCAG recommendation for touch accessibility. Ensures usable on mobile devices. | WCAG 2.1, GIGW Guidelines |
| Visible focus indicators | Cyan outline on focus | Keyboard navigation requires visible focus state for accessibility. | WCAG 2.1 |
| Language selector | English + Telugu | Andhra Pradesh official languages. GIGW requires multilingual support. Telugu uses distinct script requiring proper font support. | GIGW Guidelines, Material Design Language Support |

---

## Typography Decisions

| Decision | Choice | Reason | Source |
|----------|--------|--------|--------|
| Font family | System sans-serif (Inter, Segoe UI) | Clean, modern, professional. Good multilingual support. Helvetica-style fonts are government standard in many countries. | Canada Federal Design Standards, Material Design |
| Body text size | 14-16px minimum | Ensures readability. WCAG recommends minimum 16px for body text. | WCAG 2.1 |
| Hindi/Telugu support | Noto Sans Devanagari, Noto Sans Telugu | Google's Noto fonts provide comprehensive coverage for Indian scripts with multiple weights. | Google Fonts, Material Design Language Support |
| Text expansion buffer | 200-300% space for translations | Hindi/Telugu text expands significantly when translated from English. UI must accommodate this. | W3C Internationalization, Material Design |

---

## Layout Decisions

| Decision | Choice | Reason | Source |
|----------|--------|--------|--------|
| Sidebar width | 280px fixed | Standard for GIS applications. Provides enough space for controls without overwhelming map canvas. | ArcGIS Pro, QGIS default layouts |
| Map fills remaining space | Flexible width | Map is primary content. Should maximize available viewport. | GIS UI Best Practices |
| Bottom bar for status | Fixed bottom position | Standard in GIS applications (QGIS, ArcGIS). Provides persistent context without blocking map or sidebar. | QGIS Status Bar, ArcGIS Pro |
| Tab navigation in sidebar | 6 tabs | Organizes complex functionality into logical groups. Progressive disclosure - shows relevant controls only. | Nielsen Norman Group Progressive Disclosure |

---

## Login Screen Decisions

| Decision | Choice | Reason | Source |
|----------|--------|--------|--------|
| Government logos prominent | Top of screen, large | GIGW mandates prominent display of government emblems to establish authenticity and prevent fraud. | GIGW Guidelines |
| Light background | White/off-white | All major Indian government portals (Aadhaar, UMANG, DigiLocker) use light backgrounds. Conveys transparency and trust. | Aadhaar Portal, UMANG, DigiLocker |
| Language selector | Top-right corner | Standard placement for language switchers. Immediately accessible. | UMANG, DigiLocker patterns |
| Simple form | Only Employee ID + Password | Minimal friction for government employees. No unnecessary fields. | UX Best Practices |
| Full-width button | Sign In spans form width | Increases touch target, clear primary action. | Material Design Guidelines |

---

## Dashboard Screen Decisions

| Decision | Choice | Reason | Source |
|----------|--------|--------|--------|
| Card-based layout | Village cards | Cards are optimal for organizing discrete items with multiple attributes. Easy to scan and compare. | Material Design, Nielsen Norman Group |
| Progress bars | Visual percentage | Government stakeholders understand progress visually better than numbers alone. Provides at-a-glance status. | Dashboard Design Best Practices |
| Summary stats at top | 3 cards (Assigned/Completed/Pending) | Executive summary pattern. Non-technical officials see high-level metrics immediately. | Government Dashboard Research |
| Search + Sort | Above list | Standard pattern for filterable lists. Reduces cognitive load for large datasets. | UX Best Practices |

---

## Map Editor Decisions

| Decision | Choice | Reason | Source |
|----------|--------|--------|--------|
| Dark sidebar | #111827 background | Reduces eye strain during extended map editing. Minimizes visual competition with satellite imagery. | ArcGIS Pro Dark Theme, QGIS Night Mapping |
| Keyboard shortcuts | V, N, E, S, D, M, Z | Standard GIS conventions. Single-key shortcuts for frequent actions increase efficiency. | QGIS, ArcGIS keyboard shortcuts |
| Mode indicator in bottom bar | Badge showing current tool | Critical for mode-based interfaces. User must always know current mode to predict behavior. | GIS UI Research, Nielsen Norman Group |
| Contextual hints | "Click to select, Shift+click for multi..." | Non-technical users need guidance. Reduces learning curve. | Onboarding Best Practices |
| Right-click context menu | Options based on selection state | Standard GIS pattern. Provides quick access to relevant actions without cluttering toolbar. | QGIS, ArcGIS context menus |

---

## Demo-Specific Decisions

| Decision | Choice | Reason | Source |
|----------|--------|--------|--------|
| Story-driven flow | Login → Dashboard → Map Editor → Export | Non-technical jury remembers stories, not features. Show complete workflow. | Public Narrative Research, Government Demo Best Practices |
| Visual over verbal | Show the map working, minimal explanation | "People forget dry numbers but remember stories." Visual demos are more compelling. | Presentation Research |
| Focus on "before/after" | Manual tracing vs AI-assisted | Government officials understand productivity gains. Clear value proposition. | Government Technology Demos |
| Minimal technical jargon | "AI detects boundaries" not "SAM model segments imagery" | Non-technical audience. Use simple, relatable language. | Presentation to Non-Technical Audiences |
| Single village demo | Nibhanupudi only | Better to show one complete flow than multiple incomplete ones. Depth over breadth. | Demo Best Practices |

---

## What NOT to Include (and Why)

| Excluded Feature | Reason |
|------------------|--------|
| User roles/permissions | Demo scope - would add complexity without showing core value |
| Approval workflows | Demo scope - not implemented, would distract from core editing features |
| Dark theme for Login/Dashboard | Goes against Indian government portal conventions |
| Complex animations | Government audience values substance over flash. Animations can feel frivolous. |
| Technical metrics in UI | Non-technical jury. Show outcomes, not implementation details. |

---

## Sources Referenced

1. **GIGW Guidelines** - Guidelines for Indian Government Websites and Apps 3.0
2. **Aadhaar Brand Guidelines** - UIDAI Logo and Brand Guidelines
3. **WCAG 2.1** - Web Content Accessibility Guidelines Level AA
4. **ArcGIS Pro Documentation** - Esri Visual Mode of Operation
5. **QGIS Documentation** - Interface themes and Night Mapping
6. **GIS Manual Color Conventions** - Standard cadastral color schemes
7. **California Assessors' Handbook** - Assessment map standards
8. **ColorBrewer 2.0** - Accessible color palettes for cartography
9. **Material Design** - Typography and language support guidelines
10. **Nielsen Norman Group** - Progressive disclosure, mode indicators
11. **W3C Internationalization** - Text expansion in translation
12. **Government Demo Best Practices** - VA.gov, Public Service storytelling research

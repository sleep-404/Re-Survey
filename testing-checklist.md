# UI Testing Checklist

Run the dev server first:
```bash
cd dashboard && npm run dev
```

Then open http://localhost:5173 in your browser.

---

## 1. Login Screen (Light Theme)

### Visual Elements
- [ ] Page has white background (light theme)
- [ ] Two logo placeholders visible (Gov, Dept circles)
- [ ] "BoundaryAI" title with "Land Parcel Editor" tagline
- [ ] Language dropdown in top-right (English/తెలుగు)
- [ ] Footer shows "Andhra Pradesh Survey & Land Records Department"
- [ ] Demo hint visible: "Demo: EMP001 / demo123"

### Form Behavior
- [ ] Employee ID field has visible label (not just placeholder)
- [ ] Password field has visible label
- [ ] Sign In button is DISABLED when fields are empty
- [ ] Sign In button is DISABLED when only Employee ID filled
- [ ] Sign In button is DISABLED when only Password filled
- [ ] Sign In button ENABLES when both fields have values

### Password Toggle
- [ ] Eye icon visible in password field
- [ ] Clicking eye shows password (text visible)
- [ ] Clicking again hides password (dots)

### Invalid Login
- [ ] Enter wrong credentials (e.g., "test" / "wrong")
- [ ] Click Sign In
- [ ] Error message appears: "Invalid credentials. Please try again."
- [ ] Input borders turn red

### Valid Login
- [ ] Enter "EMP001" / "demo123"
- [ ] Click Sign In (or press Enter)
- [ ] Loading spinner appears in button
- [ ] Navigates to Dashboard

---

## 2. Dashboard Screen (Light Theme)

### Visual Elements
- [ ] Page has white background (light theme)
- [ ] Header shows logo, "BoundaryAI", and user name "Ravi Kumar"
- [ ] Welcome message: "Welcome, Ravi Kumar"
- [ ] Role shown: "Survey Officer • Guntur District"

### Summary Cards
- [ ] Blue card shows "4" Assigned
- [ ] Green card shows "1" Completed
- [ ] Amber card shows "3" Pending

### Search & Sort
- [ ] Search box visible with placeholder "Search villages..."
- [ ] Sort dropdown visible with "Sort by: Name" default
- [ ] Type "nib" in search → Only Nibhanupudi shown
- [ ] Clear search → All 4 villages shown
- [ ] Type "satte" in search → Only Manchala shown (matches mandal)
- [ ] Clear search
- [ ] Change sort to "Progress" → Villages reorder by progress %
- [ ] Change sort to "Parcels" → Villages reorder by parcel count

### Village Cards
- [ ] 4 village cards displayed
- [ ] Each card shows: name, mandal, parcel count, progress bar
- [ ] Nibhanupudi: 0% progress, "Start →" button
- [ ] Kondaveedu: 100% progress, green bar, checkmark, "View →"
- [ ] Manchala: 45% progress, blue bar, "Continue →"
- [ ] Vemuru: 0% progress, "Start →" button

### Village Click - No Data Available
- [ ] Click on "Kondaveedu" card
- [ ] Toast appears: "Kondaveedu data not available in demo"
- [ ] Stay on Dashboard (no navigation)
- [ ] Click on "Manchala" → Toast appears, stay on Dashboard
- [ ] Click on "Vemuru" → Toast appears, stay on Dashboard

### Village Click - Has Data
- [ ] Click on "Nibhanupudi" card
- [ ] Navigates to Map Editor

### User Dropdown
- [ ] Click on "Ravi Kumar" in header
- [ ] Dropdown opens with "Logout" option
- [ ] Click outside dropdown → closes
- [ ] Click "Ravi Kumar" again → opens

### Keyboard Navigation
- [ ] Tab through the page - focus moves logically
- [ ] Tab to a village card, press Enter → same as click

---

## 3. Map Editor Screen (Dark Theme)

### Visual Elements
- [ ] Page has dark background (gray-900)
- [ ] Header shows back arrow, "Nibhanupudi", "Pedakurapadu"
- [ ] User name "Ravi Kumar" in header with dropdown

### Back Button
- [ ] Click back arrow (←) in header
- [ ] Returns to Dashboard
- [ ] Click Nibhanupudi again to return to Editor

### Auto-Save Indicator
- [ ] Make an edit (draw a polygon or select and delete)
- [ ] "Auto-saved" appears briefly in header (green text)

### User Dropdown in Editor
- [ ] Click user name dropdown
- [ ] "Logout" option visible
- [ ] Click Logout → Returns to Login screen

### Existing Editor Features (Verify Still Working)
- [ ] Map loads with parcels visible
- [ ] Can zoom in/out with scroll
- [ ] Can pan by dragging
- [ ] Sidebar tabs work (Tools, Layers, Classify, Validate, ROR, Stats)

### Tools (Quick Check)
- [ ] Press V → Select mode active
- [ ] Click a parcel → It gets selected (cyan border)
- [ ] Press N → Draw mode active
- [ ] Press Escape → Returns to select mode
- [ ] Press D with parcel selected → Deletes it
- [ ] Press Z → Undoes the delete

---

## 4. Route Protection

### Direct URL Access - Not Logged In
- [ ] Log out if logged in
- [ ] Go to http://localhost:5173/dashboard directly
- [ ] Redirects to Login screen
- [ ] Go to http://localhost:5173/editor directly
- [ ] Redirects to Login screen

### Direct URL Access - Logged In, No Village
- [ ] Log in with EMP001/demo123
- [ ] In browser URL bar, go to http://localhost:5173/editor directly
- [ ] Redirects to Dashboard (no village selected)

### Unknown Routes
- [ ] Go to http://localhost:5173/random-page
- [ ] Redirects to Login screen

---

## 5. Session Persistence

### Login Persistence
- [ ] Log in with EMP001/demo123
- [ ] Refresh the page (F5)
- [ ] Still on Dashboard (not redirected to login)
- [ ] User name still shows "Ravi Kumar"

### Logout Clears Session
- [ ] Click Logout
- [ ] Refresh the page
- [ ] Still on Login screen (session cleared)

### Working Data Persists After Logout
- [ ] Log in and go to Editor
- [ ] Make some edits (draw a polygon)
- [ ] Log out
- [ ] Log back in, select Nibhanupudi
- [ ] Previous edits should still be there (auto-saved to localStorage)

---

## 6. Responsive Behavior (Optional)

### Mobile Width (~375px)
- [ ] Login form still usable
- [ ] Dashboard cards stack vertically
- [ ] Village cards stack in single column

### Tablet Width (~768px)
- [ ] Dashboard shows 2 cards per row
- [ ] Summary cards in a row

---

## Notes

_Add any bugs or issues found here:_

-


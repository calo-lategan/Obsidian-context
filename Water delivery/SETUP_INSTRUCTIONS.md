# Water Delivery V2 — Setup (3 steps, that's it)

## Step 1: Paste the Code
1. Open **Water Delivery V2** spreadsheet
2. Go to **Extensions → Apps Script**
3. **Delete ALL existing code** in the editor
4. Open `WaterDeliveryV2_AppsScript.js` → copy everything → paste into editor
5. Press **Ctrl+S** to save

## Step 2: Run Setup
1. In the function dropdown at the top, select **`setupAll`**
2. Click **▶ Run**
3. Google asks to authorize — click **Review Permissions** → your account → **Advanced** → **Go to Water Delivery V2 (unsafe)** → **Allow**
4. Wait for it to finish (check the Execution Log at the bottom — it will say "Setup complete")

**That's it.** The setup automatically:
- Creates/formats the Master Entry sheet with headers
- Creates the hidden Supplier Lookup sheet
- Builds the Job Dashboard with search box, entry fields, and checkbox buttons
- Installs the edit trigger (so search and buttons work automatically)

## Step 3: Import Data
1. Go back to the spreadsheet (close the script editor tab)
2. Reload the page (Ctrl+R) so the menu appears
3. Click **Water Delivery** (in the menu bar) → **Import All Data from Original Sheet**
4. Click **Yes** → wait 30-60 seconds
5. Check **Master Entry** tab — data is grouped by job number with separators

---

## How to Use

### Buttons are CHECKBOXES — just tick them
No drawings needed. The three buttons are checkboxes that auto-uncheck after running:

| Checkbox | Location | What it does |
|----------|----------|-------------|
| SUBMIT | G6 | Saves the entry to Master Entry |
| NEW JOB | A8 | Creates a new job number with supplier |
| ADD ROW | D8 | Pre-fills entry area for the current searched job |

### Search: Type job number in B2, press Enter
Results appear instantly below row 11.

### Quick Entry: Fill A6–E6, tick SUBMIT (G6)
- A6 = Job Number (supplier auto-fills in F6)
- B6 = Doc Number
- C6 = Water Type (dropdown)
- D6 = Volume
- E6 = Wait Hours
- Tick G6 checkbox → entry saved, fields cleared

### Edit results directly
Change any cell in the results area (row 12+) — it syncs back to Master Entry automatically.

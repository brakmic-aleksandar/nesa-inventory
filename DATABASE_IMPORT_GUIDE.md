# Database Structure & Data Import

## Database Schema

### Tables

#### 1. `stands`

Stores stand/kiosk information.

| Column      | Type    | Description                  |
| ----------- | ------- | ---------------------------- |
| id          | INTEGER | Primary key (auto-increment) |
| name        | TEXT    | Stand name (e.g., "Štand 1") |
| subtitle    | TEXT    | Stand subtitle/description   |
| icon        | TEXT    | Ionicons icon name           |
| color       | TEXT    | Hex color code               |
| order_index | INTEGER | Display order                |

#### 2. `stand_items`

Stores items for each stand (necklaces).

| Column       | Type    | Description                           |
| ------------ | ------- | ------------------------------------- |
| id           | INTEGER | Primary key (auto-increment)          |
| stand_id     | INTEGER | Foreign key to stands table           |
| name         | TEXT    | Item name                             |
| color_number | TEXT    | Item color number (nullable)          |
| row_index    | INTEGER | Row position (0-6)                    |
| col_index    | INTEGER | Column position (0-9)                 |
| item_code    | TEXT    | Item code/SKU - not unique (nullable) |
| image_path   | TEXT    | Path to local image (nullable)        |

#### 3. `shelf_items`

Stores shelf/souvenir items.

| Column      | Type    | Description                    |
| ----------- | ------- | ------------------------------ |
| id          | INTEGER | Primary key (auto-increment)   |
| name        | TEXT    | Item name                      |
| image_path  | TEXT    | Path to local image (nullable) |
| order_index | INTEGER | Display order                  |

## Image Storage

Images can be provided in two ways:

### 1. File Paths (Traditional Method)

Images are stored locally in the `assets/images/` folder. The database stores relative paths.

**Format:**

- Path example: `assets/images/gold-necklace.png`
- Fallback: If `image_path` is null, a placeholder is used

### 2. Embedded Images in Excel (Recommended)

You can embed images directly into Excel cells, and they will be automatically extracted during import.

**How to embed images:**

1. In Excel, insert an image into a cell (Insert → Picture)
2. Alternatively, paste base64-encoded image data (format: `data:image/png;base64,iVBORw0KG...`)
3. Place the image in the `image_path` column for the corresponding row
4. During import, images are automatically saved to `imported_images/` folder

**Supported image formats:**

- PNG, JPEG, GIF, BMP, WEBP

**Recommended image sizes:**

- Stand items: 100x100px
- Shelf items: 150x150px

## Excel Import Format

The app uses a **single Excel file** with **four sheets**:

### Sheet 1: Stand Items

This sheet contains all stand items. Stands are automatically created based on unique `stand_name` values.

**Required columns (recommended user-friendly headers):**

- `Stand Name` - Name of the stand (stands will be created automatically)
- `Item Name` - Item name
- `Row` - Row position (starts from 1)
- `Column` - Column position (starts from 1)
- `Color Order` - Color order (starts from 1)

**Optional columns:**

- `Color Number` - Item color number
- `Item Code` - Item code/SKU (not unique)
- `Image` - For embedded images or file paths

**Example:**

```
stand_name | name          | color_number | row_index | col_index | item_code | image_path
Štand 1    | Gold Chain    | 101          | 0         | 0         | GC001     |
Štand 1    | Gold Ring     | 102          | 0         | 1         | GR001     |
Štand 2    | Silver Chain  | 201          | 0         | 0         | SC001     |
```

### Sheet 2: Shelf Items

This sheet contains all shelf/souvenir items.

**Required columns (recommended user-friendly headers):**

- `Item Name` - Item name
- `Order` - Display order (starts from 1)

**Optional columns:**

- `Image` - For embedded images or file paths

**Example:**

```
name            | image_path | order_index
Magnet Beograd  |            | 0
Magnet Srbija   |            | 1
Privezak        |            | 2
```

### Sheet 3: Customers

This sheet contains all customer names for quick selection.

**Required columns (recommended user-friendly headers):**

- `Customer Name` - Customer name (unique)
- `Order` - Display order (starts from 1)

**Example:**

```
name                 | order_index
John Doe             | 0
Jane Smith           | 1
Acme Corp            | 2
Tech Solutions LLC   | 3

### Sheet 4: Stand Configuration

Optional configuration for stand export formatting.

**Recommended columns:**

- `Stand Name` - Exact stand name from Sheet 1
- `Per Row` - localized yes/no only:
   - English: `yes` / `no`
   - Serbian: `da` / `ne`
   - Spanish: `si` / `no`

**Behavior:**

- `Per Row = true`: row-specific color columns printed above each row block
- `Per Row = false`: single global color columns for the whole stand sheet (default)

If this sheet is missing, or a stand has no row in this sheet, export uses `per_sheet`.
```

### Embedded Images (Excel only)

You can embed images directly into Excel cells:

- Insert image directly into the `image_path` column cell
- Or paste base64 image data in the cell (format: `data:image/png;base64,iVBORw...`)
- The app will automatically extract and save the image

### Automatic Stand Creation

Stands are **automatically created** from unique `stand_name` values in the Stand Items sheet:

- Each unique stand name gets its own stand
- Stands are assigned colors automatically
- Default icon is "albums-outline"
- Stands are ordered alphabetically

**Example:**
If your Stand Items sheet has items with stand names "Štand 1", "Štand 2", and "Štand 3", three stands will be automatically created.

## How to Import Data

1. **Open Settings** - Tap the settings icon on the start screen
2. **Click "Import Data"** button
3. **Select Excel file** - Choose a properly formatted .xlsx file with three sheets
4. **Confirm import** - The app will automatically import all three sheets

## Generate Example Excel File

You can generate an example Excel file with sample data by calling:

```javascript
import { excelImport } from './services/ExcelImportService';

const result = await excelImport.generateExampleFiles();
// File will be saved in: {documentDirectory}/example_templates/
// - inventory_import_template.xlsx (with three sheets)
```

The generated file includes:

- **Sheet 1 (Stand Items)** - Sample stand items for multiple stands
- **Sheet 2 (Shelf Items)** - Sample shelf items
- **Sheet 3 (Customers)** - Sample customer names

This file can be used as a template for your own data imports.

## Notes

- **Backup:** Data is stored in SQLite database (`inventory.db`)
- **Images:**
  - **Excel files:** Insert images directly into cells in the `image_path` column
  - **Base64:** Paste base64-encoded images (format: `data:image/png;base64,iVBORw...`) in Excel cells
  - **File paths:** You can also provide file paths like `assets/images/item.png`
  - Imported images are automatically saved to the app's document directory
- **Automatic Stand Creation:** No need to create stands separately - they're created automatically from stand_name values
- **Encoding:** Excel files handle UTF-8 encoding automatically (supports Cyrillic characters)
- **Sheet Names:** First sheet is for Stand Items, second sheet is for Shelf Items, third sheet is for Customers. Optional fourth sheet is Stand Configuration.
- **Column Names:** Header names are flexible. The importer accepts both legacy snake_case headers and user-friendly headers in all supported app languages (English, Serbian, Spanish).
- **Customer Selection:** On the start screen, customers can be selected from a dropdown list instead of typing names

## Example Workflow

### Recommended: Single Excel File with Four Sheets

1. Create an Excel file (.xlsx) with four sheets:
   - **Sheet 1:** Stand Items with `stand_name`, `name`, `row_index`, `col_index`, etc.
   - **Sheet 2:** Shelf Items with `name`, `order_index`, etc.
   - **Sheet 3:** Customers with `name`, `order_index`
   - **Sheet 4:** Stand Configuration with `Stand Name`, `Per Row`
2. (Optional) Insert images directly into cells in the `image_path` column:
   - Right-click on the cell → Insert → Picture
   - Or paste base64-encoded image data
3. Import the Excel file through Settings → Import Data
4. Images are automatically extracted and saved
5. Stands are automatically created from unique stand names
6. Customers are imported and available in the dropdown
7. Restart the app to see changes

**Benefits:**

- Single file to manage
- Stands are created automatically
- Customers can be quickly selected from a list
- No need to type customer names repeatedly
- No need to import multiple files
- Easy to maintain and update

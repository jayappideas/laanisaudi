# Revenue and Reports API Documentation

## Overview
This documentation covers the comprehensive revenue and reports system for admin and vendors, including points redemption tracking, customer activity analysis, and commission reporting.

---

## Admin Routes

### 1. Reports Dashboard
**Endpoint:** `GET /admin/reports`

**Description:** Main dashboard showing overall revenue statistics, points activity, and top vendors.

**Query Parameters:**
- `period` (optional): Filter by time period
  - Values: `all`, `today`, `week`, `month`, `year`
  - Default: `all`
- `startDate` (optional): Start date for custom range (YYYY-MM-DD)
- `endDate` (optional): End date for custom range (YYYY-MM-DD)
- `vendorId` (optional): Filter by specific vendor

**Response:** HTML page with:
- Total revenue, commission, transactions
- Points earned and redeemed statistics
- Revenue trend chart
- Top performing vendors list

**View:** `views/admin/reports.ejs`

---

### 2. Points Redemption Report
**Endpoint:** `GET /admin/reports/points-redemption`

**Description:** Detailed report of all points redemption transactions showing customer activity and discount values.

**Query Parameters:**
- `startDate` (optional): Start date filter (YYYY-MM-DD)
- `endDate` (optional): End date filter (YYYY-MM-DD)
- `vendorId` (optional): Filter by specific vendor
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response Data:**
- Date and time of redemption
- Number of points redeemed
- Corresponding discount value applied
- Customer information
- Vendor information
- Bill amount and final amount

**View:** `views/admin/pointsRedemption.ejs`

---

### 3. Customer Activity Report
**Endpoint:** `GET /admin/reports/customer-activity`

**Description:** Access reports on customer activity within the app related to their vendor.

**Query Parameters:**
- `vendorId` (required): Vendor ID to get customer activity for
- `startDate` (optional): Start date filter (YYYY-MM-DD)
- `endDate` (optional): End date filter (YYYY-MM-DD)
- `page` (optional): Page number for pagination
- `limit` (optional): Items per page (default: 20)

**Response Data:**
- Customer name and details
- Number of visits
- Points earned
- Points redeemed
- Total spent amount
- Last visit date

**View:** `views/admin/customerActivity.ejs`

---

### 4. Vendor Commission Report
**Endpoint:** `GET /admin/reports/vendor-commission`

**Description:** Shows total transactional amount and commission breakdown for all vendors.

**Query Parameters:**
- `startDate` (optional): Start date filter (YYYY-MM-DD)
- `endDate` (optional): End date filter (YYYY-MM-DD)
- `page` (optional): Page number for pagination
- `limit` (optional): Items per page (default: 20)

**Response Data:**
- Vendor name and details
- Total transactions
- Total revenue
- Admin commission amount
- Vendor earnings (revenue - commission)

**View:** `views/admin/vendorCommission.ejs`

---

### 5. Export Reports
**Endpoint:** `GET /admin/reports/export`

**Description:** Export reports data in CSV or JSON format.

**Query Parameters:**
- `type` (required): Type of report
  - Values: `redemptions`, `transactions`
- `format` (optional): Export format
  - Values: `csv`, `json`
  - Default: `csv`
- `startDate` (optional): Start date filter (YYYY-MM-DD)
- `endDate` (optional): End date filter (YYYY-MM-DD)
- `vendorId` (optional): Filter by specific vendor

**Response:** CSV file download or JSON data

---

### 6. Dashboard API (JSON)
**Endpoint:** `GET /admin/reports/api/dashboard`

**Description:** Get dashboard data in JSON format for API consumption.

**Query Parameters:**
- `period` (optional): `today`, `week`, `month`, `year`
- `startDate` (optional): Start date (YYYY-MM-DD)
- `endDate` (optional): End date (YYYY-MM-DD)
- `vendorId` (optional): Filter by vendor

**Response (JSON):**
```json
{
  "success": true,
  "stats": {
    "totalRevenue": 15000.50,
    "totalBillAmount": 18000.00,
    "totalDiscounts": 2500.50,
    "totalTransactions": 150,
    "totalCommission": 1500.05,
    "totalPointsEarned": 3000,
    "totalPointsSpent": 1200
  },
  "revenueTrend": [
    {
      "_id": { "year": 2025, "month": 1, "day": 15 },
      "revenue": 500.50,
      "commission": 50.05,
      "transactions": 10
    }
  ]
}
```

---

## Vendor API Routes

All vendor routes require authentication (vendor token).

### 1. Vendor Dashboard
**Endpoint:** `GET /api/vendor/reports/dashboard`

**Description:** Get vendor-specific revenue and performance metrics.

**Headers:**
```
Authorization: Bearer <vendor_token>
```

**Query Parameters:**
- `period` (optional): `today`, `week`, `month`, `year`
- `startDate` (optional): Start date (YYYY-MM-DD)
- `endDate` (optional): End date (YYYY-MM-DD)

**Response (JSON):**
```json
{
  "success": true,
  "stats": {
    "totalTransactions": 45,
    "totalBillAmount": 5000.00,
    "totalDiscounts": 500.00,
    "totalRevenue": 4500.00,
    "totalCommissionPaid": 450.00,
    "totalPointsGiven": 900,
    "totalPointsRedeemed": 300,
    "netEarnings": 4050.00
  },
  "revenueTrend": [...],
  "topCustomers": [...]
}
```

---

### 2. Vendor Points Redemption Report
**Endpoint:** `GET /api/vendor/reports/points-redemption`

**Description:** Get all points redemption transactions at vendor's location.

**Headers:**
```
Authorization: Bearer <vendor_token>
```

**Query Parameters:**
- `startDate` (optional): Start date (YYYY-MM-DD)
- `endDate` (optional): End date (YYYY-MM-DD)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response (JSON):**
```json
{
  "success": true,
  "redemptions": [
    {
      "_id": "...",
      "createdAt": "2025-01-15T10:30:00Z",
      "user": {
        "name": "John Doe",
        "email": "john@example.com"
      },
      "staff": {
        "name": "Staff Member"
      },
      "spentPoints": 100,
      "discountAmount": 10.00,
      "billAmount": 100.00,
      "finalAmount": 90.00
    }
  ],
  "stats": {
    "totalPointsRedeemed": 1200,
    "totalDiscountGiven": 120.00,
    "totalRedemptions": 45
  },
  "pagination": {
    "total": 45,
    "page": 1,
    "pages": 3,
    "limit": 20
  }
}
```

---

### 3. Vendor Customer Activity Report
**Endpoint:** `GET /api/vendor/reports/customer-activity`

**Description:** Get customer activity data for vendor's location.

**Headers:**
```
Authorization: Bearer <vendor_token>
```

**Query Parameters:**
- `startDate` (optional): Start date (YYYY-MM-DD)
- `endDate` (optional): End date (YYYY-MM-DD)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response (JSON):**
```json
{
  "success": true,
  "customerActivity": [
    {
      "_id": "customer_id",
      "totalVisits": 10,
      "totalSpent": 1000.00,
      "totalPointsEarned": 200,
      "totalPointsRedeemed": 50,
      "lastVisit": "2025-01-15T10:30:00Z",
      "firstVisit": "2024-12-01T10:30:00Z",
      "customer": {
        "_id": "...",
        "name": "Jane Doe",
        "email": "jane@example.com",
        "photo": "photo_url"
      }
    }
  ],
  "pagination": {...}
}
```

---

### 4. Vendor Transaction List
**Endpoint:** `GET /api/vendor/reports/transactions`

**Description:** Get all transactions for the vendor with date and time filters.

**Headers:**
```
Authorization: Bearer <vendor_token>
```

**Query Parameters:**
- `startDate` (optional): Start date (YYYY-MM-DD)
- `endDate` (optional): End date (YYYY-MM-DD)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response (JSON):**
```json
{
  "success": true,
  "transactions": [...],
  "summary": {
    "totalAmount": 10000.00,
    "totalCommission": 1000.00,
    "netEarnings": 9000.00
  },
  "pagination": {...}
}
```

---

### 5. Vendor Commission Report
**Endpoint:** `GET /api/vendor/reports/commission`

**Description:** See how much commission is sent to admin from total transactional amount.

**Headers:**
```
Authorization: Bearer <vendor_token>
```

**Query Parameters:**
- `startDate` (optional): Start date (YYYY-MM-DD)
- `endDate` (optional): End date (YYYY-MM-DD)

**Response (JSON):**
```json
{
  "success": true,
  "stats": {
    "totalRevenue": 10000.00,
    "totalCommission": 1000.00,
    "netEarnings": 9000.00,
    "transactionCount": 100
  },
  "commissionPercentage": 10,
  "commissionTrend": [
    {
      "_id": { "year": 2025, "month": 1, "day": 15 },
      "revenue": 500.00,
      "commission": 50.00,
      "netEarnings": 450.00
    }
  ]
}
```

---

### 6. Export Vendor Reports
**Endpoint:** `GET /api/vendor/reports/export`

**Description:** Export vendor reports in CSV or JSON format.

**Headers:**
```
Authorization: Bearer <vendor_token>
```

**Query Parameters:**
- `type` (required): `transactions` or `redemptions`
- `format` (optional): `csv` or `json` (default: `csv`)
- `startDate` (optional): Start date (YYYY-MM-DD)
- `endDate` (optional): End date (YYYY-MM-DD)

**Response:** CSV file download or JSON data

---

## Database Models Used

### Transaction Model
```javascript
{
  user: ObjectId,           // Customer
  staff: ObjectId,          // Staff member (links to vendor)
  discount: ObjectId,       // Applied discount
  items: [...],            // Menu items purchased
  earnedPoints: Number,    // Points earned from this transaction
  spentPoints: Number,     // Points used for discount
  billAmount: Number,      // Amount before discount
  redeemBalancePoint: Boolean,
  discountAmount: Number,  // Discount value
  finalAmount: Number,     // Final amount after discount
  adminCommission: Number, // Commission to admin
  tID: String,            // Transaction ID
  status: String,         // pending, accepted, rejected, expired
  createdAt: Date,
  updatedAt: Date
}
```

### PointsHistory Model
```javascript
{
  user: ObjectId,
  staff: ObjectId,
  transaction: ObjectId,
  type: String,           // earn, spend
  points: Number,
  note: String,
  transactionTime: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### UserPoint Model
```javascript
{
  user: ObjectId,
  vendor: ObjectId,
  totalPoints: Number,
  createdAt: Date,
  updatedAt: Date
}
```

---

## Features Implemented

### Admin Features:
✅ Access reports on points redeemed by customers at their vendor
✅ Display date and time of redemption
✅ Show number of points redeemed
✅ Show corresponding discount value applied
✅ Access reports on customer activity within the app related to their vendor
✅ Number of visits tracking
✅ Points earned tracking
✅ Points redeemed tracking
✅ Data visualization for understanding customer behavior
✅ Filter by date and time
✅ Export reports as CSV

### Vendor Features:
✅ See total transactional amount
✅ Filter transactions by date & time
✅ See how much commission is sent to admin
✅ View customer activity at their location
✅ Track points redemption
✅ Export data in CSV/JSON format

---

## Usage Examples

### Admin: Get Reports Dashboard
```
GET /admin/reports?period=month
```

### Admin: Get Points Redemption for Specific Date Range
```
GET /admin/reports/points-redemption?startDate=2025-01-01&endDate=2025-01-31
```

### Admin: Export Redemption Data as CSV
```
GET /admin/reports/export?type=redemptions&format=csv&startDate=2025-01-01&endDate=2025-01-31
```

### Vendor: Get Dashboard (API)
```
GET /api/vendor/reports/dashboard?period=week
Headers: Authorization: Bearer <token>
```

### Vendor: Get Commission Report
```
GET /api/vendor/reports/commission?startDate=2025-01-01&endDate=2025-01-31
Headers: Authorization: Bearer <token>
```

---

## Notes

1. **Authentication**: All vendor API routes require valid JWT token in Authorization header
2. **Date Format**: All dates should be in YYYY-MM-DD format
3. **Pagination**: Default page size is 20 items, can be adjusted with `limit` parameter
4. **Time Zone**: All timestamps are stored in UTC
5. **Currency**: All amounts are in SAR (Saudi Riyal)

---

## Support

For any questions or issues, please contact the development team.

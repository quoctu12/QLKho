const express = require("express");

const {
  getDashboardSummary,
  getStockMovementReport,
  getInventoryByWarehouse,
  getInventoryAlertReport,
  getReportFilterOptions,
} = require("../controllers/reportController");

const {
  authenticate,
  authorize,
} = require("../middlewares/authMiddleware");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Bảo vệ toàn bộ API báo cáo
|--------------------------------------------------------------------------
*/

router.use(authenticate);
router.use(authorize("ADMIN", "MANAGER"));

/*
|--------------------------------------------------------------------------
| Tổng quan Dashboard
|--------------------------------------------------------------------------
*/

router.get(
  "/dashboard-summary",
  getDashboardSummary
);

/*
|--------------------------------------------------------------------------
| Báo cáo nhập xuất
|--------------------------------------------------------------------------
*/

router.get(
  "/stock-movement",
  getStockMovementReport
);

/*
|--------------------------------------------------------------------------
| Báo cáo tồn kho theo kho
|--------------------------------------------------------------------------
*/

router.get(
  "/inventory-by-warehouse",
  getInventoryByWarehouse
);

/*
|--------------------------------------------------------------------------
| Báo cáo cảnh báo tồn kho
|--------------------------------------------------------------------------
*/

router.get(
  "/inventory-alerts",
  getInventoryAlertReport
);

/*
|--------------------------------------------------------------------------
| Danh sách dữ liệu bộ lọc
|--------------------------------------------------------------------------
*/

router.get(
  "/filter-options",
  getReportFilterOptions
);

module.exports = router;
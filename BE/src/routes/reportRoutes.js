const express = require("express");

const {
  getDashboardSummary,
  getStockMovementReport,
  getInventoryValueByWarehouse,
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
|
| Chỉ ADMIN và MANAGER được truy cập Dashboard và báo cáo.
| STAFF không có quyền xem các số liệu tổng quan và báo cáo.
|
*/

router.use(authenticate);
router.use(authorize("ADMIN", "MANAGER"));

/*
|--------------------------------------------------------------------------
| Lấy số liệu tổng quan Dashboard
|--------------------------------------------------------------------------
*/

router.get(
  "/dashboard-summary",
  getDashboardSummary
);

/*
|--------------------------------------------------------------------------
| Lấy báo cáo nhập xuất kho
|--------------------------------------------------------------------------
*/

router.get(
  "/stock-movement",
  getStockMovementReport
);

/*
|--------------------------------------------------------------------------
| Lấy giá trị tồn kho theo kho
|--------------------------------------------------------------------------
*/

router.get(
  "/inventory-by-warehouse",
  getInventoryValueByWarehouse
);

module.exports = router;
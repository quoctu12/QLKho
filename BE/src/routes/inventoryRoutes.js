const express = require("express");

const {
  getInventoryBatches,
  getInventorySummary,
  getInventoryByProduct,
} = require("../controllers/inventoryController");

const {
  authenticate,
  authorize,
} = require("../middlewares/authMiddleware");

const router = express.Router();

// Tất cả người dùng đã đăng nhập đều được xem tồn kho
router.get(
  "/batches",
  authenticate,
  authorize("ADMIN", "MANAGER", "STAFF"),
  getInventoryBatches
);

router.get(
  "/summary",
  authenticate,
  authorize("ADMIN", "MANAGER", "STAFF"),
  getInventorySummary
);

router.get(
  "/products",
  authenticate,
  authorize("ADMIN", "MANAGER", "STAFF"),
  getInventoryByProduct
);

module.exports = router;
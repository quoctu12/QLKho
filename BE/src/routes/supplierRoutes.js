const express = require("express");

const {
  getAllSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} = require("../controllers/supplierController");

const {
  authenticate,
  authorize,
} = require("../middlewares/authMiddleware");

const router = express.Router();

// ADMIN và MANAGER và STAFF được xem nhà cung cấp
router.get(
  "/",
  authenticate,
  authorize("ADMIN", "MANAGER", "STAFF"),
  getAllSuppliers
);

// ADMIN và MANAGER được thêm nhà cung cấp
router.post(
  "/",
  authenticate,
  authorize("ADMIN", "MANAGER"),
  createSupplier
);

// ADMIN và MANAGER được cập nhật nhà cung cấp
router.put(
  "/:id",
  authenticate,
  authorize("ADMIN", "MANAGER"),
  updateSupplier
);

// Chỉ ADMIN được xóa nhà cung cấp
router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  deleteSupplier
);

module.exports = router;
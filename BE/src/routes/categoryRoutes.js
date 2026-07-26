const express = require("express");

const {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/categoryController");

const {
  authenticate,
  authorize,
} = require("../middlewares/authMiddleware");

const router = express.Router();

// ADMIN và MANAGER được xem danh mục
router.get(
  "/",
  authenticate,
  authorize("ADMIN", "MANAGER"),
  getAllCategories
);

// ADMIN và MANAGER được tạo danh mục
router.post(
  "/",
  authenticate,
  authorize("ADMIN", "MANAGER"),
  createCategory
);

// ADMIN và MANAGER được cập nhật danh mục
router.put(
  "/:id",
  authenticate,
  authorize("ADMIN", "MANAGER"),
  updateCategory
);

// Chỉ ADMIN được xóa danh mục
router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  deleteCategory
);

module.exports = router;
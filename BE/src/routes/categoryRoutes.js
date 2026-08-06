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

/*
|--------------------------------------------------------------------------
| Xem danh mục
|--------------------------------------------------------------------------
|
| STAFF cần quyền này để chọn danh mục khi tạo sản phẩm.
|
*/

router.get(
  "/",
  authenticate,
  authorize(
    "ADMIN",
    "MANAGER",
    "STAFF"
  ),
  getAllCategories
);

/*
|--------------------------------------------------------------------------
| Thêm danh mục
|--------------------------------------------------------------------------
*/

router.post(
  "/",
  authenticate,
  authorize(
    "ADMIN",
    "MANAGER"
  ),
  createCategory
);

/*
|--------------------------------------------------------------------------
| Cập nhật danh mục
|--------------------------------------------------------------------------
*/

router.put(
  "/:id",
  authenticate,
  authorize(
    "ADMIN",
    "MANAGER"
  ),
  updateCategory
);

/*
|--------------------------------------------------------------------------
| Xóa danh mục
|--------------------------------------------------------------------------
*/

router.delete(
  "/:id",
  authenticate,
  authorize(
    "ADMIN",
    "MANAGER"
  ),
  deleteCategory
);

module.exports = router;
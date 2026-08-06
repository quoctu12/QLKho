const express = require("express");

const {
  getAllUnits,
  createUnit,
  updateUnit,
  deleteUnit,
} = require("../controllers/unitController");

const {
  authenticate,
  authorize,
} = require("../middlewares/authMiddleware");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Xem đơn vị tính
|--------------------------------------------------------------------------
*/

router.get(
  "/",
  authenticate,
  authorize(
    "ADMIN",
    "MANAGER",
    "STAFF"
  ),
  getAllUnits
);

/*
|--------------------------------------------------------------------------
| Thêm đơn vị tính
|--------------------------------------------------------------------------
*/

router.post(
  "/",
  authenticate,
  authorize(
    "ADMIN",
    "MANAGER"
  ),
  createUnit
);

/*
|--------------------------------------------------------------------------
| Cập nhật đơn vị tính
|--------------------------------------------------------------------------
*/

router.put(
  "/:id",
  authenticate,
  authorize(
    "ADMIN",
    "MANAGER"
  ),
  updateUnit
);

/*
|--------------------------------------------------------------------------
| Xóa đơn vị tính
|--------------------------------------------------------------------------
*/

router.delete(
  "/:id",
  authenticate,
  authorize(
    "ADMIN",
    "MANAGER"
  ),
  deleteUnit
);

module.exports = router;
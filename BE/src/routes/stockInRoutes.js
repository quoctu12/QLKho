const express = require("express");

const {
  getAllStockIns,
  getStockInById,
  createStockIn,
} = require("../controllers/stockInController");

const {
  authenticate,
  authorize,
} = require("../middlewares/authMiddleware");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Lấy danh sách phiếu nhập
|--------------------------------------------------------------------------
*/

router.get(
  "/",
  authenticate,
  authorize("ADMIN", "MANAGER", "STAFF"),
  getAllStockIns
);

/*
|--------------------------------------------------------------------------
| Lấy chi tiết một phiếu nhập
|--------------------------------------------------------------------------
*/

router.get(
  "/:id",
  authenticate,
  authorize("ADMIN", "MANAGER", "STAFF"),
  getStockInById
);

/*
|--------------------------------------------------------------------------
| Tạo phiếu nhập
|--------------------------------------------------------------------------
*/

router.post(
  "/",
  authenticate,
  authorize("ADMIN", "MANAGER", "STAFF"),
  createStockIn
);

module.exports = router;
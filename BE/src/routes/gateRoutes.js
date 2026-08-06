const express = require("express");

const {
  getAllGates,
  createGate,
  updateGate,
  deleteGate,
} = require("../controllers/gateController");

const {
  authenticate,
  authorize,
} = require("../middlewares/authMiddleware");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Xem danh sách cổng kho
|--------------------------------------------------------------------------
|
| STAFF cần xem cổng kho để lập phiếu nhập và phiếu xuất.
|
*/

router.get(
  "/",
  authenticate,
  authorize("ADMIN", "MANAGER", "STAFF"),
  getAllGates
);

/*
|--------------------------------------------------------------------------
| Thêm cổng kho
|--------------------------------------------------------------------------
*/

router.post(
  "/",
  authenticate,
  authorize("ADMIN", "MANAGER"),
  createGate
);

/*
|--------------------------------------------------------------------------
| Cập nhật cổng kho
|--------------------------------------------------------------------------
*/

router.put(
  "/:id",
  authenticate,
  authorize("ADMIN", "MANAGER"),
  updateGate
);

/*
|--------------------------------------------------------------------------
| Xóa cổng kho
|--------------------------------------------------------------------------
*/

router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN", "MANAGER"),
  deleteGate
);

module.exports = router;
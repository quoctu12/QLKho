const express = require("express");

const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  updateUserStatus,
  resetPassword,
} = require("../controllers/userController");

const {
  authenticate,
  authorize,
} = require("../middlewares/authMiddleware");

const router = express.Router();

router.use(authenticate);
router.use(authorize("ADMIN"));

router.get("/", getAllUsers);
router.get("/:id", getUserById);
router.post("/", createUser);
router.put("/:id", updateUser);
router.patch("/:id/status", updateUserStatus);
router.patch("/:id/reset-password", resetPassword);

module.exports = router;
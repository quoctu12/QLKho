const express = require("express");

const { login, getProfile, updateProfile } = require("../controllers/authController");
const { authenticate } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/login", login);
router.get("/profile", authenticate, getProfile);
router.put("/profile", authenticate, updateProfile);

module.exports = router;
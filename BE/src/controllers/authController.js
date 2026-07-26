const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/database");

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn:
        process.env.JWT_EXPIRES_IN || "1d",
    }
  );
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Vui lòng nhập email và mật khẩu.",
      });
    }

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    const [users] = await pool.query(
      `
        SELECT
          u.id,
          u.full_name,
          u.email,
          u.password,
          u.role_id,
          u.status,

          CASE
            WHEN u.role_id = 1 THEN 'ADMIN'
            WHEN u.role_id = 2 THEN 'STAFF'
            WHEN u.role_id = 3 THEN 'MANAGER'
            ELSE 'STAFF'
          END AS role

        FROM users u
        WHERE LOWER(u.email) = ?
        LIMIT 1
      `,
      [normalizedEmail]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message:
          "Email hoặc mật khẩu không chính xác.",
      });
    }

    const user = users[0];

    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Tài khoản đã bị khóa.",
      });
    }

    const passwordMatched =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!passwordMatched) {
      return res.status(401).json({
        success: false,
        message:
          "Email hoặc mật khẩu không chính xác.",
      });
    }

    const token = createToken(user);

    return res.status(200).json({
      success: true,
      message: "Đăng nhập thành công.",
      data: {
        token,
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role_id: user.role_id,
          role: user.role,
          status: user.status,
        },
      },
    });
  } catch (error) {
    console.error("Lỗi đăng nhập:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể đăng nhập.",
    });
  }
}

async function getProfile(req, res) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Bạn chưa đăng nhập.",
      });
    }

    const [users] = await pool.query(
      `
        SELECT
          u.id,
          u.full_name,
          u.email,
          u.role_id,
          u.status,
          u.created_at,

          CASE
            WHEN u.role_id = 1 THEN 'ADMIN'
            WHEN u.role_id = 2 THEN 'STAFF'
            WHEN u.role_id = 3 THEN 'MANAGER'
            ELSE 'STAFF'
          END AS role

        FROM users u
        WHERE u.id = ?
        LIMIT 1
      `,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "Không tìm thấy người dùng.",
      });
    }

    const user = users[0];

    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Tài khoản đã bị khóa.",
      });
    }

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Lỗi lấy hồ sơ:", error);

    return res.status(500).json({
      success: false,
      message:
        "Không thể lấy thông tin người dùng.",
    });
  }
}

async function updateProfile(req, res) {
  try {
    const userId = req.user?.id;
    const fullName = req.body.full_name?.trim();

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Bạn chưa đăng nhập.",
      });
    }

    if (!fullName) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập họ và tên.",
      });
    }

    if (fullName.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Họ và tên phải có ít nhất 2 ký tự.",
      });
    }

    if (fullName.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Họ và tên không được vượt quá 100 ký tự.",
      });
    }

    const [users] = await pool.query(
      `
        SELECT id, status
        FROM users
        WHERE id = ?
        LIMIT 1
      `,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng.",
      });
    }

    if (users[0].status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Tài khoản đã bị khóa.",
      });
    }

    await pool.query(
      `
        UPDATE users
        SET full_name = ?
        WHERE id = ?
      `,
      [fullName, userId]
    );

    const [updatedUsers] = await pool.query(
      `
        SELECT
          u.id,
          u.full_name,
          u.email,
          u.role_id,
          u.status,
          u.created_at,
          CASE
            WHEN u.role_id = 1 THEN 'ADMIN'
            WHEN u.role_id = 2 THEN 'STAFF'
            WHEN u.role_id = 3 THEN 'MANAGER'
            ELSE 'STAFF'
          END AS role
        FROM users u
        WHERE u.id = ?
        LIMIT 1
      `,
      [userId]
    );

    return res.status(200).json({
      success: true,
      message: "Cập nhật hồ sơ thành công.",
      data: updatedUsers[0],
    });
  } catch (error) {
    console.error("Lỗi cập nhật hồ sơ:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể cập nhật hồ sơ.",
    });
  }
}


module.exports = {
  login,
  getProfile,
  updateProfile,
};
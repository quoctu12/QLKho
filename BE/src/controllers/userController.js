const bcrypt = require("bcryptjs");
const pool = require("../config/database");

function getRoleName(roleId) {
  const roleMap = {
    1: "ADMIN",
    2: "STAFF",
    3: "MANAGER",
  };

  return roleMap[Number(roleId)] || "STAFF";
}

async function getAllUsers(req, res) {
  try {
    const [users] = await pool.query(`
      SELECT
        u.id,
        u.role_id,
        u.full_name,
        u.email,
        u.status,
        u.created_at,
        CASE
          WHEN u.role_id = 1 THEN 'ADMIN'
          WHEN u.role_id = 2 THEN 'STAFF'
          WHEN u.role_id = 3 THEN 'MANAGER'
          ELSE 'STAFF'
        END AS role
      FROM users u
      ORDER BY u.id DESC
    `);

    return res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách người dùng:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy danh sách người dùng.",
    });
  }
}

async function getUserById(req, res) {
  try {
    const userId = Number(req.params.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Mã tài khoản không hợp lệ.",
      });
    }

    const [users] = await pool.query(
      `
        SELECT
          u.id,
          u.role_id,
          u.full_name,
          u.email,
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
        message: "Không tìm thấy tài khoản.",
      });
    }

    return res.status(200).json({
      success: true,
      data: users[0],
    });
  } catch (error) {
    console.error("Lỗi lấy tài khoản:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy thông tin tài khoản.",
    });
  }
}

async function createUser(req, res) {
  try {
    const {
      full_name,
      email,
      password,
      role_id,
      status = "active",
    } = req.body;

    const normalizedFullName = full_name?.trim();
    const normalizedEmail = email?.trim().toLowerCase();
    const normalizedRoleId = Number(role_id);

    if (!normalizedFullName || !normalizedEmail || !password || !normalizedRoleId) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập họ tên, email, mật khẩu và vai trò.",
      });
    }

    if (normalizedFullName.length < 2 || normalizedFullName.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Họ tên phải có từ 2 đến 100 ký tự.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu phải có ít nhất 6 ký tự.",
      });
    }

    if (![1, 2, 3].includes(normalizedRoleId)) {
      return res.status(400).json({
        success: false,
        message: "Vai trò không hợp lệ.",
      });
    }

    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái không hợp lệ.",
      });
    }

    const [existingUsers] = await pool.query(
      `
        SELECT id
        FROM users
        WHERE LOWER(email) = ?
        LIMIT 1
      `,
      [normalizedEmail]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Email đã được sử dụng.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `
        INSERT INTO users (
          role_id,
          full_name,
          email,
          password,
          status
        )
        VALUES (?, ?, ?, ?, ?)
      `,
      [
        normalizedRoleId,
        normalizedFullName,
        normalizedEmail,
        hashedPassword,
        status,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Tạo tài khoản thành công.",
      data: {
        id: result.insertId,
        role_id: normalizedRoleId,
        role: getRoleName(normalizedRoleId),
        full_name: normalizedFullName,
        email: normalizedEmail,
        status,
      },
    });
  } catch (error) {
    console.error("Lỗi tạo tài khoản:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể tạo tài khoản.",
    });
  }
}

async function updateUser(req, res) {
  try {
    const userId = Number(req.params.id);
    const currentUserId = Number(req.user?.id);

    const {
      full_name,
      email,
      role_id,
      status,
    } = req.body;

    const normalizedFullName = full_name?.trim();
    const normalizedEmail = email?.trim().toLowerCase();
    const normalizedRoleId = Number(role_id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Mã tài khoản không hợp lệ.",
      });
    }

    if (!normalizedFullName || !normalizedEmail || !normalizedRoleId || !status) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập đầy đủ thông tin.",
      });
    }

    if (normalizedFullName.length < 2 || normalizedFullName.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Họ tên phải có từ 2 đến 100 ký tự.",
      });
    }

    if (![1, 2, 3].includes(normalizedRoleId)) {
      return res.status(400).json({
        success: false,
        message: "Vai trò không hợp lệ.",
      });
    }

    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái không hợp lệ.",
      });
    }

    const [existingUsers] = await pool.query(
      `
        SELECT id, role_id, status
        FROM users
        WHERE id = ?
        LIMIT 1
      `,
      [userId]
    );

    if (existingUsers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tài khoản.",
      });
    }

    const existingUser = existingUsers[0];
    const isCurrentUser = userId === currentUserId;

    if (isCurrentUser && normalizedRoleId !== Number(existingUser.role_id)) {
      return res.status(400).json({
        success: false,
        message: "Bạn không thể tự thay đổi vai trò của chính mình.",
      });
    }

    if (isCurrentUser && status === "inactive") {
      return res.status(400).json({
        success: false,
        message: "Bạn không thể tự khóa tài khoản đang đăng nhập.",
      });
    }

    const [duplicateEmail] = await pool.query(
      `
        SELECT id
        FROM users
        WHERE LOWER(email) = ?
          AND id <> ?
        LIMIT 1
      `,
      [normalizedEmail, userId]
    );

    if (duplicateEmail.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Email đã được sử dụng.",
      });
    }

    await pool.query(
      `
        UPDATE users
        SET
          full_name = ?,
          email = ?,
          role_id = ?,
          status = ?
        WHERE id = ?
      `,
      [
        normalizedFullName,
        normalizedEmail,
        normalizedRoleId,
        status,
        userId,
      ]
    );

    return res.status(200).json({
      success: true,
      message: "Cập nhật tài khoản thành công.",
      data: {
        id: userId,
        full_name: normalizedFullName,
        email: normalizedEmail,
        role_id: normalizedRoleId,
        role: getRoleName(normalizedRoleId),
        status,
      },
    });
  } catch (error) {
    console.error("Lỗi cập nhật tài khoản:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể cập nhật tài khoản.",
    });
  }
}

async function updateUserStatus(req, res) {
  try {
    const userId = Number(req.params.id);
    const currentUserId = Number(req.user?.id);
    const { status } = req.body;

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Mã tài khoản không hợp lệ.",
      });
    }

    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái không hợp lệ.",
      });
    }

    if (userId === currentUserId && status === "inactive") {
      return res.status(400).json({
        success: false,
        message: "Bạn không thể tự khóa tài khoản đang đăng nhập.",
      });
    }

    const [result] = await pool.query(
      `
        UPDATE users
        SET status = ?
        WHERE id = ?
      `,
      [status, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tài khoản.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        status === "active"
          ? "Đã mở khóa tài khoản."
          : "Đã khóa tài khoản.",
    });
  } catch (error) {
    console.error("Lỗi đổi trạng thái:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể thay đổi trạng thái tài khoản.",
    });
  }
}

async function resetPassword(req, res) {
  try {
    const userId = Number(req.params.id);
    const { new_password } = req.body;

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Mã tài khoản không hợp lệ.",
      });
    }

    if (!new_password || new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu mới phải có ít nhất 6 ký tự.",
      });
    }

    const [users] = await pool.query(
      `
        SELECT id
        FROM users
        WHERE id = ?
        LIMIT 1
      `,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy tài khoản.",
      });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);

    await pool.query(
      `
        UPDATE users
        SET password = ?
        WHERE id = ?
      `,
      [hashedPassword, userId]
    );

    return res.status(200).json({
      success: true,
      message: "Đặt lại mật khẩu thành công.",
    });
  } catch (error) {
    console.error("Lỗi đặt lại mật khẩu:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể đặt lại mật khẩu.",
    });
  }
}

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  updateUserStatus,
  resetPassword,
};
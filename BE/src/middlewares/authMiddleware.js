const jwt = require("jsonwebtoken");

/*
|--------------------------------------------------------------------------
| Kiểm tra đăng nhập
|--------------------------------------------------------------------------
*/

function authenticate(req, res, next) {
  try {
    const authorizationHeader =
      req.headers.authorization;

    if (
      !authorizationHeader ||
      !authorizationHeader.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        success: false,
        message: "Bạn chưa đăng nhập.",
      });
    }

    const token =
      authorizationHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token đăng nhập không hợp lệ.",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message:
        "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Kiểm tra vai trò
|--------------------------------------------------------------------------
*/

function authorize(...allowedRoles) {
  return function (req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Bạn chưa đăng nhập.",
      });
    }

    const currentRole = String(
      req.user.role || ""
    ).toUpperCase();

    const normalizedAllowedRoles =
      allowedRoles.map((role) =>
        String(role).toUpperCase()
      );

    if (
      !normalizedAllowedRoles.includes(
        currentRole
      )
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Bạn không có quyền thực hiện chức năng này.",
      });
    }

    next();
  };
}

module.exports = {
  authenticate,
  authorize,
};
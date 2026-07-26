const jwt = require("jsonwebtoken");

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

function authorize(...allowedRoles) {
  return function (req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Bạn chưa đăng nhập.",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
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
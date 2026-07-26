const multer = require("multer");
const path = require("path");
const fs = require("fs");

/*
|--------------------------------------------------------------------------
| Thư mục lưu ảnh sản phẩm
|--------------------------------------------------------------------------
*/

const uploadDirectory = path.join(
  __dirname,
  "../../uploads/products"
);

/*
 * Nếu thư mục chưa tồn tại thì tự động tạo.
 */
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, {
    recursive: true,
  });
}

/*
|--------------------------------------------------------------------------
| Cấu hình nơi lưu và tên file
|--------------------------------------------------------------------------
*/

const storage = multer.diskStorage({
  destination(req, file, callback) {
    callback(null, uploadDirectory);
  },

  filename(req, file, callback) {
    const fileExtension =
      path.extname(file.originalname).toLowerCase();

    const uniqueName =
      `product-${Date.now()}-${Math.round(
        Math.random() * 1e9
      )}${fileExtension}`;

    callback(null, uniqueName);
  },
});

/*
|--------------------------------------------------------------------------
| Kiểm tra định dạng ảnh
|--------------------------------------------------------------------------
*/

function imageFileFilter(
  req,
  file,
  callback
) {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  const allowedExtensions = [
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
  ];

  const fileExtension =
    path.extname(
      file.originalname
    ).toLowerCase();

  const isValidMimeType =
    allowedMimeTypes.includes(
      file.mimetype
    );

  const isValidExtension =
    allowedExtensions.includes(
      fileExtension
    );

  if (
    !isValidMimeType ||
    !isValidExtension
  ) {
    return callback(
      new Error(
        "Ảnh phải có định dạng JPG, JPEG, PNG hoặc WEBP."
      )
    );
  }

  return callback(null, true);
}

/*
|--------------------------------------------------------------------------
| Middleware upload ảnh sản phẩm
|--------------------------------------------------------------------------
*/

const uploadProductImage = multer({
  storage,

  fileFilter: imageFileFilter,

  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

module.exports = uploadProductImage;
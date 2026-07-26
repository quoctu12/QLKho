const fs = require("fs");
const path = require("path");
const pool = require("../config/database");

/*
|--------------------------------------------------------------------------
| Các giá trị được phép
|--------------------------------------------------------------------------
*/

const ALLOWED_STATUSES = ["active", "inactive"];

const ALLOWED_SORTS = {
  newest: "p.id DESC",
  oldest: "p.id ASC",
  name_asc: "p.name ASC, p.id ASC",
  name_desc: "p.name DESC, p.id DESC",
  sku_asc: "p.sku ASC, p.id ASC",
  sku_desc: "p.sku DESC, p.id DESC",
};

/*
|--------------------------------------------------------------------------
| Kiểm tra ID sản phẩm
|--------------------------------------------------------------------------
*/

function validateProductId(id) {
  const productId = Number(id);

  if (!Number.isInteger(productId) || productId <= 0) {
    return null;
  }

  return productId;
}

/*
|--------------------------------------------------------------------------
| Tạo đường dẫn ảnh để lưu vào database
|--------------------------------------------------------------------------
|
| Ví dụ:
| /uploads/products/product-123456.jpg
|
*/

function getUploadedImagePath(file) {
  if (!file) {
    return null;
  }

  return `/uploads/products/${file.filename}`;
}

/*
|--------------------------------------------------------------------------
| Chuyển đường dẫn ảnh thành URL đầy đủ cho frontend
|--------------------------------------------------------------------------
|
| Database lưu:
| /uploads/products/product-123456.jpg
|
| Frontend nhận:
| http://localhost:3000/uploads/products/product-123456.jpg
|
*/

function buildImageUrl(req, imagePath) {
  if (!imagePath) {
    return null;
  }

  if (
    imagePath.startsWith("http://") ||
    imagePath.startsWith("https://")
  ) {
    return imagePath;
  }

  return `${req.protocol}://${req.get("host")}${imagePath}`;
}

/*
|--------------------------------------------------------------------------
| Chuẩn hóa dữ liệu sản phẩm trả về frontend
|--------------------------------------------------------------------------
*/

function formatProduct(req, product) {
  return {
    ...product,
    image_url: buildImageUrl(req, product.image_url),
  };
}

function formatProducts(req, products) {
  return products.map((product) => formatProduct(req, product));
}

/*
|--------------------------------------------------------------------------
| Xóa file ảnh trong thư mục uploads
|--------------------------------------------------------------------------
*/

function deleteImageFile(imagePath) {
  if (!imagePath || !imagePath.startsWith("/uploads/products/")) {
    return;
  }

  const fileName = path.basename(imagePath);
  const absolutePath = path.join(
    __dirname,
    "../../uploads/products",
    fileName
  );

  fs.unlink(absolutePath, (error) => {
    if (error && error.code !== "ENOENT") {
      console.error("Không thể xóa ảnh sản phẩm:", error);
    }
  });
}

/*
|--------------------------------------------------------------------------
| Xóa file vừa được Multer upload nếu xử lý thất bại
|--------------------------------------------------------------------------
*/

function deleteUploadedFile(file) {
  if (!file?.path) {
    return;
  }

  fs.unlink(file.path, (error) => {
    if (error && error.code !== "ENOENT") {
      console.error("Không thể xóa file vừa upload:", error);
    }
  });
}

/*
|--------------------------------------------------------------------------
| Chuẩn hóa dữ liệu nhận từ form
|--------------------------------------------------------------------------
*/

function normalizeProductInput(req, currentImagePath = null) {
  const body = req.body || {};

  let imagePath = currentImagePath;

  /*
   * Nếu người dùng upload ảnh mới thì dùng ảnh mới.
   */
  if (req.file) {
    imagePath = getUploadedImagePath(req.file);
  }

  /*
   * Dùng cho trang sửa sản phẩm khi người dùng yêu cầu xóa ảnh cũ.
   */
  if (String(body.remove_image || "").toLowerCase() === "true") {
    imagePath = null;
  }

  return {
    categoryId: Number(body.category_id),
    name: String(body.name || "").trim(),
    sku: String(body.sku || "").trim().toUpperCase(),
    description: String(body.description || "").trim() || null,
    imagePath,
    minimumStock: Number(body.minimum_stock ?? 0),
    status: String(body.status || "active").trim().toLowerCase(),
  };
}

/*
|--------------------------------------------------------------------------
| Kiểm tra dữ liệu sản phẩm
|--------------------------------------------------------------------------
*/

function validateProductInput(product) {
  if (!Number.isInteger(product.categoryId) || product.categoryId <= 0) {
    return "Danh mục không hợp lệ.";
  }

  if (!product.name) {
    return "Tên sản phẩm là bắt buộc.";
  }

  if (product.name.length > 255) {
    return "Tên sản phẩm không được vượt quá 255 ký tự.";
  }

  if (!product.sku) {
    return "Mã SKU là bắt buộc.";
  }

  if (product.sku.length > 100) {
    return "Mã SKU không được vượt quá 100 ký tự.";
  }

  if (product.description && product.description.length > 2000) {
    return "Mô tả không được vượt quá 2000 ký tự.";
  }

  /*
   * Mức tồn tối thiểu phải là số nguyên không âm.
   */
  if (
    !Number.isInteger(product.minimumStock) ||
    product.minimumStock < 0
  ) {
    return "Mức tồn tối thiểu phải là số nguyên lớn hơn hoặc bằng 0.";
  }

  if (product.minimumStock > 999999999) {
    return "Mức tồn tối thiểu quá lớn.";
  }

  if (!ALLOWED_STATUSES.includes(product.status)) {
    return "Trạng thái sản phẩm không hợp lệ.";
  }

  return null;
}

/*
|--------------------------------------------------------------------------
| Kiểm tra danh mục tồn tại
|--------------------------------------------------------------------------
*/

async function categoryExists(connection, categoryId) {
  const [rows] = await connection.query(
    `
      SELECT id
      FROM categories
      WHERE id = ?
      LIMIT 1
    `,
    [categoryId]
  );

  return rows.length > 0;
}

/*
|--------------------------------------------------------------------------
| Lấy danh sách sản phẩm
|--------------------------------------------------------------------------
|
| Hỗ trợ:
| - Tìm theo tên, SKU và tên danh mục
| - Lọc theo danh mục
| - Lọc theo trạng thái
| - Sắp xếp
| - Phân trang phía backend
|
*/

async function getAllProducts(req, res) {
  try {
    const {
      keyword,
      category_id,
      status,
      sort_by = "newest",
    } = req.query;

    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 10);

    if (!Number.isInteger(page) || page <= 0) {
      return res.status(400).json({
        success: false,
        message: "Số trang không hợp lệ.",
      });
    }

    if (!Number.isInteger(limit) || limit <= 0 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: "Số sản phẩm mỗi trang phải từ 1 đến 100.",
      });
    }

    if (status && !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái sản phẩm không hợp lệ.",
      });
    }

    if (!ALLOWED_SORTS[sort_by]) {
      return res.status(400).json({
        success: false,
        message: "Kiểu sắp xếp không hợp lệ.",
      });
    }

    const conditions = [];
    const params = [];

    /*
     * Tìm kiếm theo tên sản phẩm, SKU hoặc tên danh mục.
     */
    if (keyword?.trim()) {
      const normalizedKeyword = keyword.trim();

      if (normalizedKeyword.length > 100) {
        return res.status(400).json({
          success: false,
          message: "Từ khóa tìm kiếm không được vượt quá 100 ký tự.",
        });
      }

      conditions.push(`
        (
          p.name LIKE ?
          OR p.sku LIKE ?
          OR c.name LIKE ?
        )
      `);

      const searchValue = `%${normalizedKeyword}%`;

      params.push(searchValue, searchValue, searchValue);
    }

    /*
     * Lọc theo danh mục.
     */
    if (category_id) {
      const categoryId = Number(category_id);

      if (!Number.isInteger(categoryId) || categoryId <= 0) {
        return res.status(400).json({
          success: false,
          message: "Mã danh mục không hợp lệ.",
        });
      }

      conditions.push("p.category_id = ?");
      params.push(categoryId);
    }

    /*
     * Lọc theo trạng thái.
     */
    if (status) {
      conditions.push("p.status = ?");
      params.push(status);
    }

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

    /*
     * Đếm tổng số sản phẩm phù hợp.
     */
    const [countRows] = await pool.query(
      `
        SELECT COUNT(*) AS total_items
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        ${whereClause}
      `,
      params
    );

    const totalItems = Number(countRows[0]?.total_items || 0);
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    const offset = (page - 1) * limit;

    /*
     * Lấy danh sách sản phẩm của trang hiện tại.
     */
    const [rows] = await pool.query(
      `
        SELECT
          p.id,
          p.name,
          p.sku,
          p.description,
          p.image_url,
          p.minimum_stock,
          p.status,
          p.created_at,
          c.id AS category_id,
          c.name AS category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        ${whereClause}
        ORDER BY ${ALLOWED_SORTS[sort_by]}
        LIMIT ?
        OFFSET ?
      `,
      [...params, limit, offset]
    );

    return res.status(200).json({
      success: true,
      data: {
        products: formatProducts(req, rows),
        pagination: {
          page,
          limit,
          total_items: totalItems,
          total_pages: totalPages,
          has_previous_page: page > 1,
          has_next_page: page < totalPages,
        },
      },
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách sản phẩm:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy danh sách sản phẩm.",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Lấy chi tiết sản phẩm
|--------------------------------------------------------------------------
*/

async function getProductById(req, res) {
  try {
    const productId = validateProductId(req.params.id);

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Mã sản phẩm không hợp lệ.",
      });
    }

    const [rows] = await pool.query(
      `
        SELECT
          p.id,
          p.name,
          p.sku,
          p.description,
          p.image_url,
          p.minimum_stock,
          p.status,
          p.created_at,
          c.id AS category_id,
          c.name AS category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.id = ?
        LIMIT 1
      `,
      [productId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm.",
      });
    }

    return res.status(200).json({
      success: true,
      data: formatProduct(req, rows[0]),
    });
  } catch (error) {
    console.error("Lỗi lấy chi tiết sản phẩm:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy thông tin sản phẩm.",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Tạo sản phẩm
|--------------------------------------------------------------------------
*/

async function createProduct(req, res) {
  let connection;

  try {
    const product = normalizeProductInput(req);
    const validationMessage = validateProductInput(product);

    if (validationMessage) {
      deleteUploadedFile(req.file);

      return res.status(400).json({
        success: false,
        message: validationMessage,
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    /*
     * Kiểm tra danh mục có tồn tại không.
     */
    const hasCategory = await categoryExists(
      connection,
      product.categoryId
    );

    if (!hasCategory) {
      await connection.rollback();
      deleteUploadedFile(req.file);

      return res.status(404).json({
        success: false,
        message: "Không tìm thấy danh mục.",
      });
    }

    /*
     * Kiểm tra SKU bị trùng.
     */
    const [existingProducts] = await connection.query(
      `
        SELECT id
        FROM products
        WHERE UPPER(sku) = ?
        LIMIT 1
      `,
      [product.sku]
    );

    if (existingProducts.length > 0) {
      await connection.rollback();
      deleteUploadedFile(req.file);

      return res.status(409).json({
        success: false,
        message: "Mã SKU đã tồn tại.",
      });
    }

    const [result] = await connection.query(
      `
        INSERT INTO products (
          category_id,
          name,
          sku,
          description,
          image_url,
          minimum_stock,
          status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        product.categoryId,
        product.name,
        product.sku,
        product.description,
        product.imagePath,
        product.minimumStock,
        product.status,
      ]
    );

    const [rows] = await connection.query(
      `
        SELECT
          p.id,
          p.name,
          p.sku,
          p.description,
          p.image_url,
          p.minimum_stock,
          p.status,
          p.created_at,
          c.id AS category_id,
          c.name AS category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.id = ?
        LIMIT 1
      `,
      [result.insertId]
    );

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: "Thêm sản phẩm thành công.",
      data: formatProduct(req, rows[0]),
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    deleteUploadedFile(req.file);

    console.error("Lỗi thêm sản phẩm:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể thêm sản phẩm.",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/*
|--------------------------------------------------------------------------
| Cập nhật sản phẩm
|--------------------------------------------------------------------------
*/

async function updateProduct(req, res) {
  let connection;
  let oldImagePath = null;
  let shouldDeleteOldImage = false;

  try {
    const productId = validateProductId(req.params.id);

    if (!productId) {
      deleteUploadedFile(req.file);

      return res.status(400).json({
        success: false,
        message: "Mã sản phẩm không hợp lệ.",
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    /*
     * Lấy thông tin sản phẩm và ảnh hiện tại.
     */
    const [existingRows] = await connection.query(
      `
        SELECT id, image_url
        FROM products
        WHERE id = ?
        LIMIT 1
        FOR UPDATE
      `,
      [productId]
    );

    if (existingRows.length === 0) {
      await connection.rollback();
      deleteUploadedFile(req.file);

      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm.",
      });
    }

    oldImagePath = existingRows[0].image_url;

    const product = normalizeProductInput(req, oldImagePath);
    const validationMessage = validateProductInput(product);

    if (validationMessage) {
      await connection.rollback();
      deleteUploadedFile(req.file);

      return res.status(400).json({
        success: false,
        message: validationMessage,
      });
    }

    /*
     * Kiểm tra danh mục.
     */
    const hasCategory = await categoryExists(
      connection,
      product.categoryId
    );

    if (!hasCategory) {
      await connection.rollback();
      deleteUploadedFile(req.file);

      return res.status(404).json({
        success: false,
        message: "Không tìm thấy danh mục.",
      });
    }

    /*
     * Kiểm tra SKU đã được sản phẩm khác sử dụng chưa.
     */
    const [duplicateSku] = await connection.query(
      `
        SELECT id
        FROM products
        WHERE UPPER(sku) = ?
          AND id <> ?
        LIMIT 1
      `,
      [product.sku, productId]
    );

    if (duplicateSku.length > 0) {
      await connection.rollback();
      deleteUploadedFile(req.file);

      return res.status(409).json({
        success: false,
        message: "Mã SKU đã được sử dụng.",
      });
    }

    await connection.query(
      `
        UPDATE products
        SET
          category_id = ?,
          name = ?,
          sku = ?,
          description = ?,
          image_url = ?,
          minimum_stock = ?,
          status = ?
        WHERE id = ?
      `,
      [
        product.categoryId,
        product.name,
        product.sku,
        product.description,
        product.imagePath,
        product.minimumStock,
        product.status,
        productId,
      ]
    );

    /*
     * Chỉ xóa ảnh cũ sau khi transaction thành công.
     */
    shouldDeleteOldImage =
      Boolean(oldImagePath) &&
      oldImagePath !== product.imagePath;

    const [updatedRows] = await connection.query(
      `
        SELECT
          p.id,
          p.name,
          p.sku,
          p.description,
          p.image_url,
          p.minimum_stock,
          p.status,
          p.created_at,
          c.id AS category_id,
          c.name AS category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE p.id = ?
        LIMIT 1
      `,
      [productId]
    );

    await connection.commit();

    if (shouldDeleteOldImage) {
      deleteImageFile(oldImagePath);
    }

    return res.status(200).json({
      success: true,
      message: "Cập nhật sản phẩm thành công.",
      data: formatProduct(req, updatedRows[0]),
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    deleteUploadedFile(req.file);

    console.error("Lỗi cập nhật sản phẩm:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể cập nhật sản phẩm.",
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/*
|--------------------------------------------------------------------------
| Ngừng hoạt động sản phẩm
|--------------------------------------------------------------------------
*/

async function deactivateProduct(req, res) {
  try {
    const productId = validateProductId(req.params.id);

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Mã sản phẩm không hợp lệ.",
      });
    }

    const [existingProduct] = await pool.query(
      `
        SELECT id, status
        FROM products
        WHERE id = ?
        LIMIT 1
      `,
      [productId]
    );

    if (existingProduct.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm.",
      });
    }

    if (existingProduct[0].status === "inactive") {
      return res.status(400).json({
        success: false,
        message: "Sản phẩm đã ngừng hoạt động.",
      });
    }

    await pool.query(
      `
        UPDATE products
        SET status = 'inactive'
        WHERE id = ?
      `,
      [productId]
    );

    return res.status(200).json({
      success: true,
      message: "Đã ngừng hoạt động sản phẩm.",
    });
  } catch (error) {
    console.error("Lỗi ngừng hoạt động sản phẩm:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể ngừng hoạt động sản phẩm.",
    });
  }
}

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deactivateProduct,
};
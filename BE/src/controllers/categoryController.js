const pool = require("../config/database");

async function getAllCategories(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT
        id,
        name,
        description
      FROM categories
      ORDER BY id DESC
    `);

    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Lỗi lấy danh mục:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy danh sách danh mục.",
    });
  }
}

async function createCategory(req, res) {
  try {
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Tên danh mục là bắt buộc.",
      });
    }

    const [existingCategories] = await pool.query(
      "SELECT id FROM categories WHERE name = ?",
      [name.trim()]
    );

    if (existingCategories.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Tên danh mục đã tồn tại.",
      });
    }

    const [result] = await pool.query(
      `
        INSERT INTO categories (name, description)
        VALUES (?, ?)
      `,
      [name.trim(), description?.trim() || null]
    );

    return res.status(201).json({
      success: true,
      message: "Thêm danh mục thành công.",
      data: {
        id: result.insertId,
        name: name.trim(),
        description: description?.trim() || null,
      },
    });
  } catch (error) {
    console.error("Lỗi thêm danh mục:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể thêm danh mục.",
    });
  }
}

async function updateCategory(req, res) {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Tên danh mục là bắt buộc.",
      });
    }

    const [existingCategory] = await pool.query(
      "SELECT id FROM categories WHERE id = ?",
      [id]
    );

    if (existingCategory.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy danh mục.",
      });
    }

    const [duplicateName] = await pool.query(
      "SELECT id FROM categories WHERE name = ? AND id <> ?",
      [name.trim(), id]
    );

    if (duplicateName.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Tên danh mục đã tồn tại.",
      });
    }

    await pool.query(
      `
        UPDATE categories
        SET name = ?, description = ?
        WHERE id = ?
      `,
      [name.trim(), description?.trim() || null, id]
    );

    return res.status(200).json({
      success: true,
      message: "Cập nhật danh mục thành công.",
    });
  } catch (error) {
    console.error("Lỗi cập nhật danh mục:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể cập nhật danh mục.",
    });
  }
}

async function deleteCategory(req, res) {
  try {
    const { id } = req.params;

    const [existingCategory] = await pool.query(
      "SELECT id FROM categories WHERE id = ?",
      [id]
    );

    if (existingCategory.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy danh mục.",
      });
    }

    const [products] = await pool.query(
      "SELECT id FROM products WHERE category_id = ? LIMIT 1",
      [id]
    );

    if (products.length > 0) {
      return res.status(409).json({
        success: false,
        message:
          "Không thể xóa vì danh mục đang được sản phẩm sử dụng.",
      });
    }

    await pool.query(
      "DELETE FROM categories WHERE id = ?",
      [id]
    );

    return res.status(200).json({
      success: true,
      message: "Xóa danh mục thành công.",
    });
  } catch (error) {
    console.error("Lỗi xóa danh mục:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể xóa danh mục.",
    });
  }
}

module.exports = {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
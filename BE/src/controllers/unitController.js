const pool = require("../config/database");

async function getAllUnits(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT
        id,
        name,
        description
      FROM product_units
      ORDER BY id DESC
    `);

    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Lỗi lấy đơn vị tính:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy danh sách đơn vị tính.",
    });
  }
}

async function createUnit(req, res) {
  try {
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Tên đơn vị tính là bắt buộc.",
      });
    }

    const [existingUnits] = await pool.query(
      "SELECT id FROM product_units WHERE name = ?",
      [name.trim()]
    );

    if (existingUnits.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Đơn vị tính đã tồn tại.",
      });
    }

    const [result] = await pool.query(
      `
        INSERT INTO product_units (name, description)
        VALUES (?, ?)
      `,
      [name.trim(), description?.trim() || null]
    );

    return res.status(201).json({
      success: true,
      message: "Thêm đơn vị tính thành công.",
      data: {
        id: result.insertId,
        name: name.trim(),
        description: description?.trim() || null,
      },
    });
  } catch (error) {
    console.error("Lỗi thêm đơn vị tính:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể thêm đơn vị tính.",
    });
  }
}

async function updateUnit(req, res) {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Tên đơn vị tính là bắt buộc.",
      });
    }

    const [existingUnit] = await pool.query(
      "SELECT id FROM product_units WHERE id = ?",
      [id]
    );

    if (existingUnit.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn vị tính.",
      });
    }

    const [duplicateUnit] = await pool.query(
      "SELECT id FROM product_units WHERE name = ? AND id <> ?",
      [name.trim(), id]
    );

    if (duplicateUnit.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Tên đơn vị tính đã tồn tại.",
      });
    }

    await pool.query(
      `
        UPDATE product_units
        SET name = ?, description = ?
        WHERE id = ?
      `,
      [name.trim(), description?.trim() || null, id]
    );

    return res.status(200).json({
      success: true,
      message: "Cập nhật đơn vị tính thành công.",
    });
  } catch (error) {
    console.error("Lỗi cập nhật đơn vị tính:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể cập nhật đơn vị tính.",
    });
  }
}

async function deleteUnit(req, res) {
  try {
    const { id } = req.params;

    const [existingUnit] = await pool.query(
      "SELECT id FROM product_units WHERE id = ?",
      [id]
    );

    if (existingUnit.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn vị tính.",
      });
    }

    const [packagingRows] = await pool.query(
      `
        SELECT id
        FROM product_packaging
        WHERE unit_id = ?
        LIMIT 1
      `,
      [id]
    );

    if (packagingRows.length > 0) {
      return res.status(409).json({
        success: false,
        message:
          "Không thể xóa vì đơn vị tính đang được cấu hình cho sản phẩm.",
      });
    }

    const [stockInRows] = await pool.query(
      `
        SELECT id
        FROM stock_in_details
        WHERE unit_id = ?
        LIMIT 1
      `,
      [id]
    );

    if (stockInRows.length > 0) {
      return res.status(409).json({
        success: false,
        message:
          "Không thể xóa vì đơn vị tính đã được sử dụng trong phiếu nhập.",
      });
    }

    await pool.query(
      "DELETE FROM product_units WHERE id = ?",
      [id]
    );

    return res.status(200).json({
      success: true,
      message: "Xóa đơn vị tính thành công.",
    });
  } catch (error) {
    console.error("Lỗi xóa đơn vị tính:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể xóa đơn vị tính.",
    });
  }
}

module.exports = {
  getAllUnits,
  createUnit,
  updateUnit,
  deleteUnit,
};
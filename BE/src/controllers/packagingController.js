const pool = require("../config/database");

async function getAllPackaging(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT
        pp.id,
        pp.product_id,
        p.name AS product_name,
        p.sku,
        pp.unit_id,
        u.name AS unit_name,
        pp.quantity_per_unit,
        pp.note
      FROM product_packaging pp
      JOIN products p ON pp.product_id = p.id
      JOIN product_units u ON pp.unit_id = u.id
      ORDER BY pp.id DESC
    `);

    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Lỗi lấy quy cách đóng gói:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy danh sách quy cách đóng gói.",
    });
  }
}

async function getPackagingByProduct(req, res) {
  try {
    const { productId } = req.params;

    const [rows] = await pool.query(
      `
        SELECT
          pp.id,
          pp.product_id,
          p.name AS product_name,
          p.sku,
          pp.unit_id,
          u.name AS unit_name,
          pp.quantity_per_unit,
          pp.note
        FROM product_packaging pp
        JOIN products p ON pp.product_id = p.id
        JOIN product_units u ON pp.unit_id = u.id
        WHERE pp.product_id = ?
        ORDER BY pp.id DESC
      `,
      [productId]
    );

    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Lỗi lấy quy cách theo sản phẩm:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy quy cách đóng gói của sản phẩm.",
    });
  }
}

async function createPackaging(req, res) {
  try {
    const {
      product_id,
      unit_id,
      quantity_per_unit,
      note,
    } = req.body;

    if (!product_id || !unit_id || !quantity_per_unit) {
      return res.status(400).json({
        success: false,
        message:
          "Sản phẩm, đơn vị tính và số lượng quy đổi là bắt buộc.",
      });
    }

    if (Number(quantity_per_unit) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Số lượng quy đổi phải lớn hơn 0.",
      });
    }

    const [existingRows] = await pool.query(
      `
        SELECT id
        FROM product_packaging
        WHERE product_id = ? AND unit_id = ?
      `,
      [product_id, unit_id]
    );

    if (existingRows.length > 0) {
      return res.status(409).json({
        success: false,
        message:
          "Sản phẩm đã có cấu hình cho đơn vị tính này.",
      });
    }

    const [result] = await pool.query(
      `
        INSERT INTO product_packaging (
          product_id,
          unit_id,
          quantity_per_unit,
          note
        )
        VALUES (?, ?, ?, ?)
      `,
      [
        product_id,
        unit_id,
        quantity_per_unit,
        note?.trim() || null,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Thêm quy cách đóng gói thành công.",
      data: {
        id: result.insertId,
        product_id,
        unit_id,
        quantity_per_unit,
        note: note?.trim() || null,
      },
    });
  } catch (error) {
    console.error("Lỗi thêm quy cách đóng gói:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể thêm quy cách đóng gói.",
    });
  }
}

async function updatePackaging(req, res) {
  try {
    const { id } = req.params;

    const {
      product_id,
      unit_id,
      quantity_per_unit,
      note,
    } = req.body;

    if (!product_id || !unit_id || !quantity_per_unit) {
      return res.status(400).json({
        success: false,
        message:
          "Sản phẩm, đơn vị tính và số lượng quy đổi là bắt buộc.",
      });
    }

    if (Number(quantity_per_unit) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Số lượng quy đổi phải lớn hơn 0.",
      });
    }

    const [existingPackaging] = await pool.query(
      `
        SELECT id
        FROM product_packaging
        WHERE id = ?
      `,
      [id]
    );

    if (existingPackaging.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy quy cách đóng gói.",
      });
    }

    const [duplicatePackaging] = await pool.query(
      `
        SELECT id
        FROM product_packaging
        WHERE product_id = ?
          AND unit_id = ?
          AND id <> ?
      `,
      [product_id, unit_id, id]
    );

    if (duplicatePackaging.length > 0) {
      return res.status(409).json({
        success: false,
        message:
          "Sản phẩm đã có cấu hình cho đơn vị tính này.",
      });
    }

    await pool.query(
      `
        UPDATE product_packaging
        SET product_id = ?,
            unit_id = ?,
            quantity_per_unit = ?,
            note = ?
        WHERE id = ?
      `,
      [
        product_id,
        unit_id,
        quantity_per_unit,
        note?.trim() || null,
        id,
      ]
    );

    return res.status(200).json({
      success: true,
      message: "Cập nhật quy cách đóng gói thành công.",
    });
  } catch (error) {
    console.error("Lỗi cập nhật quy cách đóng gói:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể cập nhật quy cách đóng gói.",
    });
  }
}

async function deletePackaging(req, res) {
  try {
    const { id } = req.params;

    const [existingRows] = await pool.query(
      `
        SELECT id
        FROM product_packaging
        WHERE id = ?
      `,
      [id]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy quy cách đóng gói.",
      });
    }

    await pool.query(
      `
        DELETE FROM product_packaging
        WHERE id = ?
      `,
      [id]
    );

    return res.status(200).json({
      success: true,
      message: "Xóa quy cách đóng gói thành công.",
    });
  } catch (error) {
    console.error("Lỗi xóa quy cách đóng gói:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể xóa quy cách đóng gói.",
    });
  }
}

module.exports = {
  getAllPackaging,
  getPackagingByProduct,
  createPackaging,
  updatePackaging,
  deletePackaging,
};
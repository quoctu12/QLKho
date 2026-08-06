const pool = require("../config/database");

/*
|--------------------------------------------------------------------------
| Lấy toàn bộ quy cách đóng gói
|--------------------------------------------------------------------------
*/

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
        pp.units_per_container,
        pp.note

      FROM product_packaging pp

      JOIN products p
        ON pp.product_id = p.id

      JOIN product_units u
        ON pp.unit_id = u.id

      ORDER BY
        p.name ASC,
        pp.id ASC
    `);

    const formattedRows = rows.map((row) => ({
      ...row,

      quantity_per_unit: Number(
        row.quantity_per_unit || 0
      ),

      units_per_container: Number(
        row.units_per_container || 0
      ),
    }));

    return res.status(200).json({
      success: true,
      data: formattedRows,
    });
  } catch (error) {
    console.error(
      "Lỗi lấy quy cách đóng gói:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Không thể lấy danh sách quy cách đóng gói.",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Lấy quy cách theo sản phẩm
|--------------------------------------------------------------------------
*/

async function getPackagingByProduct(req, res) {
  try {
    const productId = Number(
      req.params.productId
    );

    if (
      !Number.isInteger(productId) ||
      productId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Mã sản phẩm không hợp lệ.",
      });
    }

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
          pp.units_per_container,
          pp.note

        FROM product_packaging pp

        JOIN products p
          ON pp.product_id = p.id

        JOIN product_units u
          ON pp.unit_id = u.id

        WHERE pp.product_id = ?

        ORDER BY pp.id ASC
      `,
      [productId]
    );

    const formattedRows = rows.map((row) => ({
      ...row,

      quantity_per_unit: Number(
        row.quantity_per_unit || 0
      ),

      units_per_container: Number(
        row.units_per_container || 0
      ),
    }));

    return res.status(200).json({
      success: true,
      data: formattedRows,
    });
  } catch (error) {
    console.error(
      "Lỗi lấy quy cách theo sản phẩm:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Không thể lấy quy cách đóng gói của sản phẩm.",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Thêm quy cách đóng gói
|--------------------------------------------------------------------------
*/

async function createPackaging(req, res) {
  try {
    const productId = Number(
      req.body.product_id
    );

    const unitId = Number(
      req.body.unit_id
    );

    const quantityPerUnit = Number(
      req.body.quantity_per_unit
    );

    const unitsPerContainer = Number(
      req.body.units_per_container
    );

    const note =
      req.body.note?.trim() || null;

    if (
      !Number.isInteger(productId) ||
      productId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Sản phẩm không hợp lệ.",
      });
    }

    if (
      !Number.isInteger(unitId) ||
      unitId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Đơn vị tính không hợp lệ.",
      });
    }

    if (
      !Number.isInteger(quantityPerUnit) ||
      quantityPerUnit <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Số lượng quy đổi phải là số nguyên lớn hơn 0.",
      });
    }

    if (
      !Number.isInteger(unitsPerContainer) ||
      unitsPerContainer <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Sức chứa một container phải là số nguyên lớn hơn 0.",
      });
    }

    if (note && note.length > 255) {
      return res.status(400).json({
        success: false,
        message:
          "Ghi chú không được vượt quá 255 ký tự.",
      });
    }

    /*
     * Kiểm tra sản phẩm tồn tại.
     */
    const [productRows] = await pool.query(
      `
        SELECT id

        FROM products

        WHERE id = ?

        LIMIT 1
      `,
      [productId]
    );

    if (productRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm.",
      });
    }

    /*
     * Kiểm tra đơn vị tính tồn tại.
     */
    const [unitRows] = await pool.query(
      `
        SELECT id

        FROM product_units

        WHERE id = ?

        LIMIT 1
      `,
      [unitId]
    );

    if (unitRows.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "Không tìm thấy đơn vị tính.",
      });
    }

    /*
     * Một sản phẩm không được có hai quy cách
     * trùng cùng một đơn vị.
     */
    const [existingRows] = await pool.query(
      `
        SELECT id

        FROM product_packaging

        WHERE product_id = ?
          AND unit_id = ?

        LIMIT 1
      `,
      [productId, unitId]
    );

    if (existingRows.length > 0) {
      return res.status(409).json({
        success: false,
        message:
          "Sản phẩm đã có quy cách cho đơn vị tính này.",
      });
    }

    const [result] = await pool.query(
      `
        INSERT INTO product_packaging (
          product_id,
          unit_id,
          quantity_per_unit,
          units_per_container,
          note
        )
        VALUES (?, ?, ?, ?, ?)
      `,
      [
        productId,
        unitId,
        quantityPerUnit,
        unitsPerContainer,
        note,
      ]
    );

    return res.status(201).json({
      success: true,
      message:
        "Thêm quy cách đóng gói thành công.",

      data: {
        id: result.insertId,
        product_id: productId,
        unit_id: unitId,
        quantity_per_unit:
          quantityPerUnit,
        units_per_container:
          unitsPerContainer,
        note,
      },
    });
  } catch (error) {
    console.error(
      "Lỗi thêm quy cách đóng gói:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Không thể thêm quy cách đóng gói.",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Cập nhật quy cách đóng gói
|--------------------------------------------------------------------------
*/

async function updatePackaging(req, res) {
  try {
    const packagingId = Number(
      req.params.id
    );

    const productId = Number(
      req.body.product_id
    );

    const unitId = Number(
      req.body.unit_id
    );

    const quantityPerUnit = Number(
      req.body.quantity_per_unit
    );

    const unitsPerContainer = Number(
      req.body.units_per_container
    );

    const note =
      req.body.note?.trim() || null;

    if (
      !Number.isInteger(packagingId) ||
      packagingId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Mã quy cách đóng gói không hợp lệ.",
      });
    }

    if (
      !Number.isInteger(productId) ||
      productId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Sản phẩm không hợp lệ.",
      });
    }

    if (
      !Number.isInteger(unitId) ||
      unitId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Đơn vị tính không hợp lệ.",
      });
    }

    if (
      !Number.isInteger(quantityPerUnit) ||
      quantityPerUnit <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Số lượng quy đổi phải là số nguyên lớn hơn 0.",
      });
    }

    if (
      !Number.isInteger(unitsPerContainer) ||
      unitsPerContainer <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Sức chứa một container phải là số nguyên lớn hơn 0.",
      });
    }

    if (note && note.length > 255) {
      return res.status(400).json({
        success: false,
        message:
          "Ghi chú không được vượt quá 255 ký tự.",
      });
    }

    const [existingPackaging] =
      await pool.query(
        `
          SELECT id

          FROM product_packaging

          WHERE id = ?

          LIMIT 1
        `,
        [packagingId]
      );

    if (existingPackaging.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "Không tìm thấy quy cách đóng gói.",
      });
    }

    const [duplicatePackaging] =
      await pool.query(
        `
          SELECT id

          FROM product_packaging

          WHERE product_id = ?
            AND unit_id = ?
            AND id <> ?

          LIMIT 1
        `,
        [
          productId,
          unitId,
          packagingId,
        ]
      );

    if (duplicatePackaging.length > 0) {
      return res.status(409).json({
        success: false,
        message:
          "Sản phẩm đã có quy cách cho đơn vị tính này.",
      });
    }

    await pool.query(
      `
        UPDATE product_packaging

        SET
          product_id = ?,
          unit_id = ?,
          quantity_per_unit = ?,
          units_per_container = ?,
          note = ?

        WHERE id = ?
      `,
      [
        productId,
        unitId,
        quantityPerUnit,
        unitsPerContainer,
        note,
        packagingId,
      ]
    );

    return res.status(200).json({
      success: true,
      message:
        "Cập nhật quy cách đóng gói thành công.",
    });
  } catch (error) {
    console.error(
      "Lỗi cập nhật quy cách đóng gói:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Không thể cập nhật quy cách đóng gói.",
    });
  }
}

/*
|--------------------------------------------------------------------------
| Xóa quy cách đóng gói
|--------------------------------------------------------------------------
*/

async function deletePackaging(req, res) {
  try {
    const packagingId = Number(
      req.params.id
    );

    if (
      !Number.isInteger(packagingId) ||
      packagingId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Mã quy cách đóng gói không hợp lệ.",
      });
    }

    const [existingRows] = await pool.query(
      `
        SELECT id

        FROM product_packaging

        WHERE id = ?

        LIMIT 1
      `,
      [packagingId]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          "Không tìm thấy quy cách đóng gói.",
      });
    }

    await pool.query(
      `
        DELETE FROM product_packaging

        WHERE id = ?
      `,
      [packagingId]
    );

    return res.status(200).json({
      success: true,
      message:
        "Xóa quy cách đóng gói thành công.",
    });
  } catch (error) {
    console.error(
      "Lỗi xóa quy cách đóng gói:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Không thể xóa quy cách đóng gói.",
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
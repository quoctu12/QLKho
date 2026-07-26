const pool = require("../config/database");

async function getAllSuppliers(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT
        id,
        name,
        phone,
        address,
        email
      FROM suppliers
      ORDER BY id DESC
    `);

    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Lỗi lấy nhà cung cấp:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể lấy danh sách nhà cung cấp.",
    });
  }
}

async function createSupplier(req, res) {
  try {
    const { name, phone, address, email } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Tên nhà cung cấp là bắt buộc.",
      });
    }

    const [existingSuppliers] = await pool.query(
      `
        SELECT id
        FROM suppliers
        WHERE name = ?
      `,
      [name.trim()]
    );

    if (existingSuppliers.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Tên nhà cung cấp đã tồn tại.",
      });
    }

    const [result] = await pool.query(
      `
        INSERT INTO suppliers (
          name,
          phone,
          address,
          email
        )
        VALUES (?, ?, ?, ?)
      `,
      [
        name.trim(),
        phone?.trim() || null,
        address?.trim() || null,
        email?.trim() || null,
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Thêm nhà cung cấp thành công.",
      data: {
        id: result.insertId,
        name: name.trim(),
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        email: email?.trim() || null,
      },
    });
  } catch (error) {
    console.error("Lỗi thêm nhà cung cấp:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể thêm nhà cung cấp.",
    });
  }
}

async function updateSupplier(req, res) {
  try {
    const { id } = req.params;
    const { name, phone, address, email } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Tên nhà cung cấp là bắt buộc.",
      });
    }

    const [existingSupplier] = await pool.query(
      "SELECT id FROM suppliers WHERE id = ?",
      [id]
    );

    if (existingSupplier.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy nhà cung cấp.",
      });
    }

    const [duplicateName] = await pool.query(
      `
        SELECT id
        FROM suppliers
        WHERE name = ? AND id <> ?
      `,
      [name.trim(), id]
    );

    if (duplicateName.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Tên nhà cung cấp đã tồn tại.",
      });
    }

    await pool.query(
      `
        UPDATE suppliers
        SET name = ?,
            phone = ?,
            address = ?,
            email = ?
        WHERE id = ?
      `,
      [
        name.trim(),
        phone?.trim() || null,
        address?.trim() || null,
        email?.trim() || null,
        id,
      ]
    );

    return res.status(200).json({
      success: true,
      message: "Cập nhật nhà cung cấp thành công.",
    });
  } catch (error) {
    console.error("Lỗi cập nhật nhà cung cấp:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể cập nhật nhà cung cấp.",
    });
  }
}

async function deleteSupplier(req, res) {
  try {
    const { id } = req.params;

    const [existingSupplier] = await pool.query(
      "SELECT id FROM suppliers WHERE id = ?",
      [id]
    );

    if (existingSupplier.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy nhà cung cấp.",
      });
    }

    const [stockInRows] = await pool.query(
      `
        SELECT id
        FROM stock_in
        WHERE supplier_id = ?
        LIMIT 1
      `,
      [id]
    );

    if (stockInRows.length > 0) {
      return res.status(409).json({
        success: false,
        message:
          "Không thể xóa vì nhà cung cấp đã được sử dụng trong phiếu nhập.",
      });
    }

    await pool.query(
      "DELETE FROM suppliers WHERE id = ?",
      [id]
    );

    return res.status(200).json({
      success: true,
      message: "Xóa nhà cung cấp thành công.",
    });
  } catch (error) {
    console.error("Lỗi xóa nhà cung cấp:", error);

    return res.status(500).json({
      success: false,
      message: "Không thể xóa nhà cung cấp.",
    });
  }
}

module.exports = {
  getAllSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
};
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getSuppliers } from "../api/supplierApi";
import { getWarehouses } from "../api/warehouseApi";
import { getGates } from "../api/gateApi";
import { getProducts } from "../api/productApi";
import { getUnits } from "../api/unitApi";
import { createStockIn } from "../api/stockInApi";
import { getWarehouseLocations } from "../api/warehouseLocationApi";

function StockInCreatePage() {
  const navigate = useNavigate();

  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [gates, setGates] = useState([]);
  const [products, setProducts] = useState([]);
  const [units, setUnits] = useState([]);
  const [locations, setLocations] = useState([]);

  const [formData, setFormData] = useState({
    supplier_id: "",
    warehouse_id: "",
    gate_id: "",
    import_date: new Date().toISOString().slice(0, 10),
    note: "",
  });

  const [details, setDetails] = useState([
    {
      product_id: "",
      unit_id: "",
      location_id: "",
      batch_code: "",
      quantity: "",
      container_quantity: "",
      expiry_date: "",
    },
  ]);

  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [error, setError] = useState("");

  /*
  |--------------------------------------------------------------------------
  | Tải dữ liệu ban đầu
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadInitialData();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Khi đổi kho thì tải lại vị trí lưu trữ
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (formData.warehouse_id) {
      loadLocationsByWarehouse(formData.warehouse_id);
    } else {
      setLocations([]);
    }
  }, [formData.warehouse_id]);

  async function loadInitialData() {
    try {
      setLoadingData(true);
      setError("");

      const [
        supplierData,
        warehouseData,
        gateData,
        productData,
        unitData,
      ] = await Promise.all([
        getSuppliers(),
        getWarehouses(),
        getGates(),

        getProducts({
          page: 1,
          limit: 100,
          status: "active",
          sort_by: "name_asc",
        }),

        getUnits(),
      ]);

      setSuppliers(Array.isArray(supplierData) ? supplierData : []);
      setWarehouses(Array.isArray(warehouseData) ? warehouseData : []);
      setGates(Array.isArray(gateData) ? gateData : []);
      setProducts(Array.isArray(productData?.products) ? productData.products : []);
      setUnits(Array.isArray(unitData) ? unitData : []);
    } catch (err) {
      console.error("Lỗi tải dữ liệu tạo phiếu nhập:", err);

      setSuppliers([]);
      setWarehouses([]);
      setGates([]);
      setProducts([]);
      setUnits([]);

      setError(
        err.response?.data?.message ||
          "Không thể tải dữ liệu tạo phiếu nhập."
      );
    } finally {
      setLoadingData(false);
    }
  }

  async function loadLocationsByWarehouse(warehouseId) {
    try {
      setLoadingLocations(true);
      setError("");

      const data = await getWarehouseLocations({
        warehouse_id: warehouseId,
        status: "active",
      });

      setLocations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Lỗi tải vị trí kho:", err);

      setLocations([]);

      setError(
        err.response?.data?.message ||
          "Không thể tải danh sách vị trí lưu trữ."
      );
    } finally {
      setLoadingLocations(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Xử lý thông tin chung của phiếu nhập
  |--------------------------------------------------------------------------
  */

  function handleFormChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
      ...(name === "warehouse_id" ? { gate_id: "" } : {}),
    }));

    /*
     * Khi đổi kho thì xóa vị trí đã chọn ở từng dòng sản phẩm.
     */
    if (name === "warehouse_id") {
      setDetails((previousDetails) =>
        previousDetails.map((item) => ({
          ...item,
          location_id: "",
        }))
      );
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Xử lý thay đổi một dòng chi tiết
  |--------------------------------------------------------------------------
  */

  function handleDetailChange(index, event) {
    const { name, value } = event.target;

    setDetails((previousDetails) =>
      previousDetails.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [name]: value,
            }
          : item
      )
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Thêm một dòng sản phẩm
  |--------------------------------------------------------------------------
  */

  function addDetailRow() {
    setDetails((previous) => [
      ...previous,
      {
        product_id: "",
        unit_id: "",
        location_id: "",
        batch_code: "",
        quantity: "",
        container_quantity: "",
        expiry_date: "",
      },
    ]);
  }

  /*
  |--------------------------------------------------------------------------
  | Xóa một dòng sản phẩm
  |--------------------------------------------------------------------------
  */

  function removeDetailRow(index) {
    if (details.length === 1) {
      alert("Phiếu nhập phải có ít nhất một sản phẩm.");
      return;
    }

    setDetails((previous) =>
      previous.filter((_, itemIndex) => itemIndex !== index)
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Kiểm tra vị trí còn trống để hiển thị
  |--------------------------------------------------------------------------
  */

  function getLocationOptionText(location) {
    const code = location.location_code || "";
    const name = location.location_name || "";
    const available = Number(location.available_containers || 0);
    const max = Number(location.max_containers || 0);

    if (max <= 0) {
      return `${code} - ${name} - chưa cấu hình sức chứa`;
    }

    return `${code} - ${name} - còn ${available} container`;
  }

  /*
  |--------------------------------------------------------------------------
  | Tạo phiếu nhập kho
  |--------------------------------------------------------------------------
  */

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (
      !formData.supplier_id ||
      !formData.warehouse_id ||
      !formData.gate_id ||
      !formData.import_date
    ) {
      setError(
        "Vui lòng chọn nhà cung cấp, kho, cổng nhập và ngày nhập."
      );
      return;
    }

    const invalidDetail = details.some((item) => {
      const quantity = Number(item.quantity);
      const containerQuantity = Number(item.container_quantity);

      return (
        !item.product_id ||
        !item.unit_id ||
        !item.location_id ||
        !item.batch_code.trim() ||
        !Number.isFinite(quantity) ||
        quantity <= 0 ||
        !Number.isInteger(containerQuantity) ||
        containerQuantity <= 0
      );
    });

    if (invalidDetail) {
      setError(
        "Vui lòng nhập đầy đủ sản phẩm, đơn vị, vị trí lưu trữ, mã lô, số lượng và số container."
      );
      return;
    }

    const duplicateProductBatch = details.some(
      (item, index) =>
        details.findIndex(
          (otherItem) =>
            String(otherItem.product_id) === String(item.product_id) &&
            otherItem.batch_code.trim().toLowerCase() ===
              item.batch_code.trim().toLowerCase()
        ) !== index
    );

    if (duplicateProductBatch) {
      setError(
        "Không được nhập trùng cùng một sản phẩm và mã lô trong một phiếu."
      );
      return;
    }

    const payload = {
      supplier_id: Number(formData.supplier_id),
      warehouse_id: Number(formData.warehouse_id),
      gate_id: Number(formData.gate_id),
      import_date: formData.import_date,
      note: formData.note.trim(),

      details: details.map((item) => ({
        product_id: Number(item.product_id),
        unit_id: Number(item.unit_id),
        location_id: Number(item.location_id),
        batch_code: item.batch_code.trim(),
        quantity: Number(item.quantity),
        container_quantity: Number(item.container_quantity),
        expiry_date: item.expiry_date || null,
      })),
    };

    try {
      setSaving(true);

      const result = await createStockIn(payload);

      alert(result.message || "Tạo phiếu nhập kho thành công.");

      navigate("/stock-ins");
    } catch (err) {
      console.error("Lỗi tạo phiếu nhập:", err);

      setError(
        err.response?.data?.message ||
          "Không thể tạo phiếu nhập kho."
      );
    } finally {
      setSaving(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Chỉ lấy cổng nhập thuộc kho đang chọn
  |--------------------------------------------------------------------------
  */

  const availableGates = gates.filter(
    (gate) =>
      Number(gate.warehouse_id) === Number(formData.warehouse_id) &&
      ["IN", "BOTH"].includes(gate.gate_type)
  );

  /*
  |--------------------------------------------------------------------------
  | Trạng thái đang tải
  |--------------------------------------------------------------------------
  */

  if (loadingData) {
    return (
      <div className="d-flex align-items-center gap-2 text-muted">
        <div className="spinner-border spinner-border-sm" role="status" />
        Đang tải dữ liệu...
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
        <div>
          <h1 className="h4 mb-1">
            Tạo phiếu nhập kho
          </h1>

          <p className="text-muted mb-0">
            Nhập hàng vào kho, chọn vị trí lưu trữ và ghi nhận số container.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => navigate("/stock-ins")}
          disabled={saving}
        >
          <i className="bi bi-arrow-left me-2" />
          Quay lại
        </button>
      </div>

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Thông tin phiếu nhập */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <h5 className="card-title mb-3">
              Thông tin phiếu nhập
            </h5>

            <div className="row">
              <div className="col-md-4 mb-3">
                <label className="form-label" htmlFor="stock-in-supplier">
                  Nhà cung cấp
                </label>

                <select
                  id="stock-in-supplier"
                  name="supplier_id"
                  className="form-select"
                  value={formData.supplier_id}
                  onChange={handleFormChange}
                  disabled={saving}
                >
                  <option value="">
                    Chọn nhà cung cấp
                  </option>

                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-4 mb-3">
                <label className="form-label" htmlFor="stock-in-warehouse">
                  Kho
                </label>

                <select
                  id="stock-in-warehouse"
                  name="warehouse_id"
                  className="form-select"
                  value={formData.warehouse_id}
                  onChange={handleFormChange}
                  disabled={saving}
                >
                  <option value="">
                    Chọn kho
                  </option>

                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-4 mb-3">
                <label className="form-label" htmlFor="stock-in-gate">
                  Cổng nhập
                </label>

                <select
                  id="stock-in-gate"
                  name="gate_id"
                  className="form-select"
                  value={formData.gate_id}
                  onChange={handleFormChange}
                  disabled={!formData.warehouse_id || saving}
                >
                  <option value="">
                    Chọn cổng nhập
                  </option>

                  {availableGates.map((gate) => (
                    <option key={gate.id} value={gate.id}>
                      {gate.name}
                    </option>
                  ))}
                </select>

                {formData.warehouse_id && availableGates.length === 0 && (
                  <div className="form-text text-danger">
                    Kho này chưa có cổng nhập phù hợp.
                  </div>
                )}
              </div>

              <div className="col-md-4 mb-3">
                <label className="form-label" htmlFor="stock-in-date">
                  Ngày nhập
                </label>

                <input
                  id="stock-in-date"
                  type="date"
                  name="import_date"
                  className="form-control"
                  value={formData.import_date}
                  onChange={handleFormChange}
                  disabled={saving}
                />
              </div>

              <div className="col-md-8 mb-3">
                <label className="form-label" htmlFor="stock-in-note">
                  Ghi chú
                </label>

                <input
                  id="stock-in-note"
                  type="text"
                  name="note"
                  className="form-control"
                  value={formData.note}
                  onChange={handleFormChange}
                  placeholder="Nhập ghi chú phiếu nhập"
                  disabled={saving}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Chi tiết sản phẩm nhập */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
              <div>
                <h5 className="card-title mb-1">
                  Chi tiết sản phẩm nhập
                </h5>

                <p className="text-muted mb-0 small">
                  Phiếu nhập chỉ ghi nhận hàng hóa, vị trí và số container, chưa tính tiền.
                </p>
              </div>

              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={addDetailRow}
                disabled={saving}
              >
                <i className="bi bi-plus-lg me-2" />
                Thêm sản phẩm
              </button>
            </div>

            {!formData.warehouse_id && (
              <div className="alert alert-warning">
                Vui lòng chọn kho trước để hệ thống hiển thị vị trí lưu trữ.
              </div>
            )}

            {formData.warehouse_id && locations.length === 0 && !loadingLocations && (
              <div className="alert alert-warning">
                Kho này chưa có vị trí lưu trữ đang hoạt động. Vui lòng thêm vị trí kho trước.
              </div>
            )}

            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th>Sản phẩm</th>
                    <th>Đơn vị</th>
                    <th>Vị trí lưu trữ</th>
                    <th>Mã lô</th>
                    <th>Số lượng</th>
                    <th>Số container</th>
                    <th>Hạn sử dụng</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {details.map((item, index) => (
                    <tr key={index}>
                      <td style={{ minWidth: "220px" }}>
                        <select
                          name="product_id"
                          className="form-select"
                          value={item.product_id}
                          onChange={(event) => handleDetailChange(index, event)}
                          disabled={saving}
                        >
                          <option value="">
                            Chọn sản phẩm
                          </option>

                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.sku} - {product.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td style={{ minWidth: "140px" }}>
                        <select
                          name="unit_id"
                          className="form-select"
                          value={item.unit_id}
                          onChange={(event) => handleDetailChange(index, event)}
                          disabled={saving}
                        >
                          <option value="">
                            Chọn đơn vị
                          </option>

                          {units.map((unit) => (
                            <option key={unit.id} value={unit.id}>
                              {unit.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td style={{ minWidth: "260px" }}>
                        <select
                          name="location_id"
                          className="form-select"
                          value={item.location_id}
                          onChange={(event) => handleDetailChange(index, event)}
                          disabled={!formData.warehouse_id || loadingLocations || saving}
                        >
                          <option value="">
                            {loadingLocations
                              ? "Đang tải vị trí..."
                              : "Chọn vị trí"}
                          </option>

                          {locations.map((location) => (
                            <option key={location.id} value={location.id}>
                              {getLocationOptionText(location)}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td style={{ minWidth: "130px" }}>
                        <input
                          type="text"
                          name="batch_code"
                          className="form-control"
                          value={item.batch_code}
                          onChange={(event) => handleDetailChange(index, event)}
                          placeholder="LO-001"
                          disabled={saving}
                        />
                      </td>

                      <td style={{ minWidth: "120px" }}>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          name="quantity"
                          className="form-control"
                          value={item.quantity}
                          onChange={(event) => handleDetailChange(index, event)}
                          disabled={saving}
                        />
                      </td>

                      <td style={{ minWidth: "140px" }}>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          name="container_quantity"
                          className="form-control"
                          value={item.container_quantity}
                          onChange={(event) => handleDetailChange(index, event)}
                          placeholder="1"
                          disabled={saving}
                        />
                      </td>

                      <td style={{ minWidth: "150px" }}>
                        <input
                          type="date"
                          name="expiry_date"
                          className="form-control"
                          value={item.expiry_date}
                          onChange={(event) => handleDetailChange(index, event)}
                          disabled={saving}
                        />
                      </td>

                      <td>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => removeDetailRow(index)}
                          disabled={saving}
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="alert alert-info mb-0 mt-3">
              <strong>Ghi chú:</strong>{" "}
              Tiền lưu kho sẽ được tính khi xuất kho dựa trên số container, số ngày lưu trữ và đơn giá lưu kho của kho.
            </div>
          </div>
        </div>

        <div className="d-flex justify-content-end gap-2">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate("/stock-ins")}
            disabled={saving}
          >
            Hủy
          </button>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                />
                Đang lưu...
              </>
            ) : (
              "Tạo phiếu nhập"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default StockInCreatePage;
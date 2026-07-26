import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getWarehouses } from "../api/warehouseApi";
import { getGates } from "../api/gateApi";
import { getProducts } from "../api/productApi";
import { getInventoryBatches } from "../api/inventoryApi";
import { createStockOut } from "../api/stockOutApi";

function StockOutCreatePage() {
  const navigate = useNavigate();

  const [warehouses, setWarehouses] = useState([]);
  const [gates, setGates] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouseBatches, setWarehouseBatches] = useState([]);
  const [warehouseInventory, setWarehouseInventory] = useState({});

  const [formData, setFormData] = useState({
    warehouse_id: "",
    gate_id: "",
    export_date: new Date().toISOString().slice(0, 10),
    export_rule: "FIFO",
    note: "",
  });

  const [details, setDetails] = useState([
    {
      product_id: "",
      quantity: "",
    },
  ]);

  const [loadingData, setLoadingData] = useState(true);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [saving, setSaving] = useState(false);
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
  | Tải tồn kho khi người dùng chọn kho
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!formData.warehouse_id) {
      setWarehouseBatches([]);
      setWarehouseInventory({});
      return;
    }

    loadWarehouseInventory(formData.warehouse_id);
  }, [formData.warehouse_id]);

  /*
  |--------------------------------------------------------------------------
  | Tải kho, cổng và sản phẩm
  |--------------------------------------------------------------------------
  */

  async function loadInitialData() {
    try {
      setLoadingData(true);
      setError("");

      const [warehouseData, gateData, productData] = await Promise.all([
        getWarehouses(),
        getGates(),
        getProducts({
          page: 1,
          limit: 100,
          status: "active",
          sort_by: "name_asc",
        }),
      ]);

      setWarehouses(Array.isArray(warehouseData) ? warehouseData : []);
      setGates(Array.isArray(gateData) ? gateData : []);
      setProducts(
        Array.isArray(productData?.products) ? productData.products : []
      );
    } catch (err) {
      console.error("Lỗi tải dữ liệu tạo phiếu xuất:", err);

      setWarehouses([]);
      setGates([]);
      setProducts([]);

      setError(
        err.response?.data?.message ||
          "Không thể tải dữ liệu tạo phiếu xuất."
      );
    } finally {
      setLoadingData(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Tải và tổng hợp tồn kho của kho đang chọn
  |--------------------------------------------------------------------------
  */

  async function loadWarehouseInventory(warehouseId) {
    try {
      setLoadingInventory(true);
      setError("");

      const batchData = await getInventoryBatches({
        warehouse_id: warehouseId,
      });

      const batches = Array.isArray(batchData) ? batchData : [];

      const exportableBatches = batches.filter((batch) =>
        isBatchExportable(batch)
      );

      const inventoryMap = exportableBatches.reduce((result, batch) => {
        const productId = String(batch.product_id);
        const quantity = Number(batch.quantity || 0);
        const containerQuantity = Number(batch.container_quantity || 0);

        if (!result[productId]) {
          result[productId] = {
            quantity: 0,
            container_quantity: 0,
          };
        }

        result[productId].quantity += quantity;
        result[productId].container_quantity += containerQuantity;

        return result;
      }, {});

      setWarehouseBatches(exportableBatches);
      setWarehouseInventory(inventoryMap);
    } catch (err) {
      console.error("Lỗi tải tồn kho của kho:", err);

      setWarehouseBatches([]);
      setWarehouseInventory({});

      setError(
        err.response?.data?.message ||
          "Không thể tải số lượng tồn kho của kho đã chọn."
      );
    } finally {
      setLoadingInventory(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Kiểm tra lô còn được phép xuất không
  |--------------------------------------------------------------------------
  */

  function isBatchExportable(batch) {
    if (Number(batch.quantity || 0) <= 0) {
      return false;
    }

    if (!batch.expiry_date) {
      return true;
    }

    const expiryDate = new Date(batch.expiry_date);
    const today = new Date();

    expiryDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    return expiryDate >= today;
  }

  /*
  |--------------------------------------------------------------------------
  | Xử lý thông tin chung của phiếu xuất
  |--------------------------------------------------------------------------
  */

  function handleFormChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
      ...(name === "warehouse_id" ? { gate_id: "" } : {}),
    }));

    if (name === "warehouse_id") {
      setDetails((previousDetails) =>
        previousDetails.map((item) => ({
          ...item,
          product_id: "",
          quantity: "",
        }))
      );

      setWarehouseBatches([]);
      setWarehouseInventory({});
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
      previousDetails.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        if (name === "product_id") {
          return {
            ...item,
            product_id: value,
            quantity: "",
          };
        }

        return {
          ...item,
          [name]: value,
        };
      })
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
        quantity: "",
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
      alert("Phiếu xuất phải có ít nhất một sản phẩm.");
      return;
    }

    setDetails((previous) =>
      previous.filter((_, itemIndex) => itemIndex !== index)
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Lấy tồn hiện tại của một sản phẩm trong kho đang chọn
  |--------------------------------------------------------------------------
  */

  function getAvailableQuantity(productId) {
    if (!productId || !formData.warehouse_id) {
      return 0;
    }

    return Number(
      warehouseInventory[String(productId)]?.quantity || 0
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Lấy tổng container hiện có của sản phẩm trong kho
  |--------------------------------------------------------------------------
  */

  function getAvailableContainers(productId) {
    if (!productId || !formData.warehouse_id) {
      return 0;
    }

    return Number(
      warehouseInventory[String(productId)]?.container_quantity || 0
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Sắp xếp lô theo FIFO hoặc FEFO để ước tính container xuất
  |--------------------------------------------------------------------------
  */

  function getSortedProductBatches(productId) {
    const productBatches = warehouseBatches.filter(
      (batch) => String(batch.product_id) === String(productId)
    );

    return [...productBatches].sort((firstBatch, secondBatch) => {
      if (formData.export_rule === "FEFO") {
        const firstHasExpiry = Boolean(firstBatch.expiry_date);
        const secondHasExpiry = Boolean(secondBatch.expiry_date);

        if (firstHasExpiry && !secondHasExpiry) {
          return -1;
        }

        if (!firstHasExpiry && secondHasExpiry) {
          return 1;
        }

        if (firstHasExpiry && secondHasExpiry) {
          const firstExpiryTime = new Date(firstBatch.expiry_date).getTime();
          const secondExpiryTime = new Date(secondBatch.expiry_date).getTime();

          if (firstExpiryTime !== secondExpiryTime) {
            return firstExpiryTime - secondExpiryTime;
          }
        }
      }

      const firstImportTime = new Date(firstBatch.import_date).getTime();
      const secondImportTime = new Date(secondBatch.import_date).getTime();

      if (firstImportTime !== secondImportTime) {
        return firstImportTime - secondImportTime;
      }

      return Number(firstBatch.id || 0) - Number(secondBatch.id || 0);
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Ước tính số container sẽ xuất
  |--------------------------------------------------------------------------
  |
  | Backend vẫn là nơi tính chính xác cuối cùng.
  | Frontend chỉ ước tính để người dùng dễ hình dung.
  |
  */

  function estimateIssuedContainers(item) {
    if (!item.product_id || !item.quantity) {
      return 0;
    }

    let remainingQuantity = Number(item.quantity || 0);
    let totalContainers = 0;

    const sortedBatches = getSortedProductBatches(item.product_id);

    for (const batch of sortedBatches) {
      if (remainingQuantity <= 0) {
        break;
      }

      const availableQuantity = Number(batch.quantity || 0);
      const availableContainers = Number(batch.container_quantity || 0);

      const issuedQuantity = Math.min(
        availableQuantity,
        remainingQuantity
      );

      const issuedContainers =
        availableContainers <= 0
          ? 0
          : Math.min(
              availableContainers,
              Math.ceil(
                (issuedQuantity / availableQuantity) * availableContainers
              )
            );

      totalContainers += issuedContainers;
      remainingQuantity -= issuedQuantity;
    }

    return totalContainers;
  }

  /*
  |--------------------------------------------------------------------------
  | Kiểm tra một dòng có vượt tồn hay không
  |--------------------------------------------------------------------------
  */

  function isQuantityExceedingStock(item) {
    if (!item.product_id || !item.quantity) {
      return false;
    }

    const quantity = Number(item.quantity);
    const availableQuantity = getAvailableQuantity(item.product_id);

    return Number.isFinite(quantity) && quantity > availableQuantity;
  }

  /*
  |--------------------------------------------------------------------------
  | Định dạng số
  |--------------------------------------------------------------------------
  */

  function formatNumber(value) {
    return Number(value || 0).toLocaleString("vi-VN");
  }

  /*
  |--------------------------------------------------------------------------
  | Tạo phiếu xuất kho
  |--------------------------------------------------------------------------
  */

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (
      !formData.warehouse_id ||
      !formData.gate_id ||
      !formData.export_date ||
      !formData.export_rule
    ) {
      setError(
        "Vui lòng chọn kho, cổng xuất, ngày xuất và quy tắc xuất."
      );
      return;
    }

    if (loadingInventory) {
      setError(
        "Dữ liệu tồn kho đang được tải. Vui lòng chờ trong giây lát."
      );
      return;
    }

    const invalidDetail = details.some((item) => {
      const quantity = Number(item.quantity);

      return (
        !item.product_id ||
        !Number.isInteger(quantity) ||
        quantity <= 0
      );
    });

    if (invalidDetail) {
      setError(
        "Vui lòng chọn sản phẩm và nhập số lượng xuất là số nguyên dương."
      );
      return;
    }

    const duplicateProduct = details.some(
      (item, index) =>
        details.findIndex(
          (otherItem) =>
            String(otherItem.product_id) === String(item.product_id)
        ) !== index
    );

    if (duplicateProduct) {
      setError(
        "Một sản phẩm chỉ được xuất một lần trong cùng phiếu."
      );
      return;
    }

    const insufficientItem = details.find((item) => {
      const quantity = Number(item.quantity);
      const availableQuantity = getAvailableQuantity(item.product_id);

      return quantity > availableQuantity;
    });

    if (insufficientItem) {
      const selectedProduct = products.find(
        (product) =>
          String(product.id) === String(insufficientItem.product_id)
      );

      const availableQuantity = getAvailableQuantity(
        insufficientItem.product_id
      );

      setError(
        `Sản phẩm "${
          selectedProduct?.name || "Không xác định"
        }" chỉ còn ${formatNumber(
          availableQuantity
        )}, không đủ để xuất ${formatNumber(
          insufficientItem.quantity
        )}.`
      );

      return;
    }

    const payload = {
      warehouse_id: Number(formData.warehouse_id),
      gate_id: Number(formData.gate_id),
      export_date: formData.export_date,
      export_rule: formData.export_rule,
      note: formData.note.trim(),

      details: details.map((item) => ({
        product_id: Number(item.product_id),
        quantity: Number(item.quantity),
      })),
    };

    try {
      setSaving(true);

      const result = await createStockOut(payload);

      alert(
        result.message ||
          "Tạo phiếu xuất kho thành công."
      );

      navigate("/stock-outs");
    } catch (err) {
      console.error("Lỗi tạo phiếu xuất:", err);

      setError(
        err.response?.data?.message ||
          "Không thể tạo phiếu xuất kho."
      );
    } finally {
      setSaving(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Chỉ lấy cổng xuất thuộc kho đang chọn
  |--------------------------------------------------------------------------
  */

  const availableGates = useMemo(
    () =>
      gates.filter(
        (gate) =>
          Number(gate.warehouse_id) === Number(formData.warehouse_id) &&
          ["OUT", "BOTH"].includes(gate.gate_type)
      ),
    [gates, formData.warehouse_id]
  );

  /*
  |--------------------------------------------------------------------------
  | Tính tổng container dự kiến
  |--------------------------------------------------------------------------
  */

  const totalEstimatedContainers = details.reduce(
    (sum, item) => sum + estimateIssuedContainers(item),
    0
  );

  /*
  |--------------------------------------------------------------------------
  | Trạng thái đang tải
  |--------------------------------------------------------------------------
  */

  if (loadingData) {
    return (
      <div className="d-flex align-items-center gap-2 text-muted">
        <div
          className="spinner-border spinner-border-sm"
          role="status"
        />

        Đang tải dữ liệu...
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
        <div>
          <h1 className="h4 mb-1">
            Tạo phiếu xuất kho
          </h1>

          <p className="text-muted mb-0">
            Hệ thống tự chọn lô theo FIFO hoặc FEFO và tính phí lưu kho theo container.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => navigate("/stock-outs")}
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
        {/* Thông tin phiếu xuất */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <h5 className="card-title mb-3">
              Thông tin phiếu xuất
            </h5>

            <div className="row">
              <div className="col-md-4 mb-3">
                <label
                  className="form-label"
                  htmlFor="stock-out-warehouse"
                >
                  Kho
                </label>

                <select
                  id="stock-out-warehouse"
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
                    <option
                      key={warehouse.id}
                      value={warehouse.id}
                    >
                      {warehouse.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-4 mb-3">
                <label
                  className="form-label"
                  htmlFor="stock-out-gate"
                >
                  Cổng xuất
                </label>

                <select
                  id="stock-out-gate"
                  name="gate_id"
                  className="form-select"
                  value={formData.gate_id}
                  onChange={handleFormChange}
                  disabled={
                    !formData.warehouse_id ||
                    availableGates.length === 0 ||
                    saving
                  }
                >
                  <option value="">
                    {!formData.warehouse_id
                      ? "Vui lòng chọn kho trước"
                      : availableGates.length === 0
                        ? "Kho chưa có cổng xuất"
                        : "Chọn cổng xuất"}
                  </option>

                  {availableGates.map((gate) => (
                    <option
                      key={gate.id}
                      value={gate.id}
                    >
                      {gate.name}
                    </option>
                  ))}
                </select>

                {formData.warehouse_id &&
                  availableGates.length === 0 && (
                    <div className="form-text text-danger">
                      Kho này chưa được cấu hình cổng OUT hoặc BOTH.
                    </div>
                  )}
              </div>

              <div className="col-md-4 mb-3">
                <label
                  className="form-label"
                  htmlFor="stock-out-date"
                >
                  Ngày xuất
                </label>

                <input
                  id="stock-out-date"
                  type="date"
                  name="export_date"
                  className="form-control"
                  value={formData.export_date}
                  onChange={handleFormChange}
                  disabled={saving}
                />
              </div>

              <div className="col-md-4 mb-3">
                <label
                  className="form-label"
                  htmlFor="stock-out-rule"
                >
                  Quy tắc xuất kho
                </label>

                <select
                  id="stock-out-rule"
                  name="export_rule"
                  className="form-select"
                  value={formData.export_rule}
                  onChange={handleFormChange}
                  disabled={saving}
                >
                  <option value="FIFO">
                    FIFO - Nhập trước xuất trước
                  </option>

                  <option value="FEFO">
                    FEFO - Hết hạn trước xuất trước
                  </option>
                </select>
              </div>

              <div className="col-md-8 mb-3">
                <label
                  className="form-label"
                  htmlFor="stock-out-note"
                >
                  Ghi chú
                </label>

                <input
                  id="stock-out-note"
                  type="text"
                  name="note"
                  className="form-control"
                  value={formData.note}
                  onChange={handleFormChange}
                  placeholder="Nhập ghi chú phiếu xuất"
                  disabled={saving}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Chi tiết sản phẩm xuất */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
              <div>
                <h5 className="card-title mb-1">
                  Chi tiết sản phẩm xuất
                </h5>

                <p className="text-muted small mb-0">
                  Phí lưu kho sẽ được hệ thống tính sau khi tạo phiếu, dựa trên số container xuất và thời gian lưu kho.
                </p>

                {loadingInventory && (
                  <div className="small text-muted mt-2">
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                    />
                    Đang tải tồn kho...
                  </div>
                )}
              </div>

              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={addDetailRow}
                disabled={
                  saving ||
                  loadingInventory ||
                  !formData.warehouse_id
                }
              >
                <i className="bi bi-plus-lg me-2" />
                Thêm sản phẩm
              </button>
            </div>

            {!formData.warehouse_id && (
              <div className="alert alert-info">
                Vui lòng chọn kho trước khi chọn sản phẩm xuất.
              </div>
            )}

            {formData.warehouse_id &&
              !loadingInventory &&
              warehouseBatches.length === 0 && (
                <div className="alert alert-warning">
                  Kho này chưa có lô hàng hợp lệ để xuất.
                </div>
              )}

            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th>Sản phẩm</th>
                    <th>Tồn hợp lệ</th>
                    <th>Container hiện có</th>
                    <th>Số lượng xuất</th>
                    <th>Container dự kiến</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>

                <tbody>
                  {details.map((item, index) => {
                    const availableQuantity = getAvailableQuantity(
                      item.product_id
                    );

                    const availableContainers = getAvailableContainers(
                      item.product_id
                    );

                    const estimatedContainers = estimateIssuedContainers(item);

                    const exceedsStock = isQuantityExceedingStock(item);

                    return (
                      <tr
                        key={index}
                        className={exceedsStock ? "table-danger" : ""}
                      >
                        <td style={{ minWidth: "280px" }}>
                          <select
                            name="product_id"
                            className="form-select"
                            value={item.product_id}
                            onChange={(event) =>
                              handleDetailChange(index, event)
                            }
                            disabled={
                              saving ||
                              loadingInventory ||
                              !formData.warehouse_id
                            }
                          >
                            <option value="">
                              Chọn sản phẩm
                            </option>

                            {products.map((product) => {
                              const stock = getAvailableQuantity(product.id);

                              return (
                                <option
                                  key={product.id}
                                  value={product.id}
                                  disabled={stock <= 0}
                                >
                                  {product.sku} - {product.name} - Tồn:{" "}
                                  {formatNumber(stock)}
                                </option>
                              );
                            })}
                          </select>
                        </td>

                        <td className="text-nowrap">
                          {!item.product_id ? (
                            <span className="text-muted">
                              Chưa chọn
                            </span>
                          ) : (
                            <div>
                              <strong
                                className={
                                  availableQuantity <= 0
                                    ? "text-danger"
                                    : "text-success"
                                }
                              >
                                {formatNumber(availableQuantity)}
                              </strong>

                              <div className="small text-muted">
                                Không tính lô hết hạn
                              </div>
                            </div>
                          )}
                        </td>

                        <td className="text-nowrap">
                          {!item.product_id ? (
                            <span className="text-muted">
                              Chưa chọn
                            </span>
                          ) : (
                            <div>
                              <strong>
                                {formatNumber(availableContainers)}
                              </strong>{" "}
                              container
                            </div>
                          )}
                        </td>

                        <td style={{ minWidth: "180px" }}>
                          <input
                            type="number"
                            min="1"
                            max={
                              item.product_id
                                ? availableQuantity
                                : undefined
                            }
                            step="1"
                            name="quantity"
                            className={`form-control ${
                              exceedsStock ? "is-invalid" : ""
                            }`}
                            value={item.quantity}
                            onChange={(event) =>
                              handleDetailChange(index, event)
                            }
                            disabled={
                              saving ||
                              loadingInventory ||
                              !item.product_id ||
                              availableQuantity <= 0
                            }
                          />

                          {exceedsStock && (
                            <div className="invalid-feedback">
                              Chỉ còn {formatNumber(availableQuantity)} sản phẩm.
                            </div>
                          )}
                        </td>

                        <td className="text-nowrap">
                          {!item.product_id || !item.quantity ? (
                            <span className="text-muted">
                              Chưa tính
                            </span>
                          ) : (
                            <strong>
                              {formatNumber(estimatedContainers)} container
                            </strong>
                          )}
                        </td>

                        <td className="text-nowrap">
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
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="d-flex justify-content-end mt-3">
              <h5>
                Tổng container dự kiến:{" "}
                <span className="text-primary">
                  {formatNumber(totalEstimatedContainers)} container
                </span>
              </h5>
            </div>

            <div className="alert alert-info mb-0 mt-3">
              <strong>Ghi chú:</strong>{" "}
              Số container trên màn hình này chỉ là dự kiến. Backend sẽ tính chính xác phí lưu kho khi tạo phiếu xuất dựa trên lô thực tế được chọn theo FIFO hoặc FEFO.
            </div>
          </div>
        </div>

        <div className="d-flex justify-content-end gap-2">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate("/stock-outs")}
            disabled={saving}
          >
            Hủy
          </button>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={
              saving ||
              loadingInventory ||
              !formData.warehouse_id ||
              availableGates.length === 0
            }
          >
            {saving ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                />
                Đang xuất kho...
              </>
            ) : (
              "Tạo phiếu xuất"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default StockOutCreatePage;
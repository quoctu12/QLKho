import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import { getSuppliers } from "../api/supplierApi";
import { getWarehouses } from "../api/warehouseApi";
import { getGates } from "../api/gateApi";
import { getProducts } from "../api/productApi";
import { getUnits } from "../api/unitApi";
import { getPackaging } from "../api/packagingApi";
import { createStockIn } from "../api/stockInApi";
import { getWarehouseLocations } from "../api/warehouseLocationApi";

function StockInCreatePage() {
  const navigate = useNavigate();

  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [gates, setGates] = useState([]);
  const [products, setProducts] = useState([]);
  const [units, setUnits] = useState([]);
  const [packagingList, setPackagingList] = useState([]);
  const [locations, setLocations] = useState([]);

  const [formData, setFormData] = useState({
    supplier_id: "",
    warehouse_id: "",
    gate_id: "",
    import_date: new Date()
      .toISOString()
      .slice(0, 10),
    note: "",
  });

  /*
   * Không còn container_quantity.
   * Backend sẽ tự tính số container.
   */
  const [details, setDetails] = useState([
    {
      product_id: "",
      unit_id: "",
      location_id: "",
      batch_code: "",
      quantity: "",
      expiry_date: "",
    },
  ]);

  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingLocations, setLoadingLocations] =
    useState(false);

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
  | Khi đổi kho thì tải lại vị trí
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (formData.warehouse_id) {
      loadLocationsByWarehouse(
        formData.warehouse_id
      );
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
        packagingData,
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

        getPackaging(),
      ]);

      setSuppliers(
        Array.isArray(supplierData)
          ? supplierData
          : []
      );

      setWarehouses(
        Array.isArray(warehouseData)
          ? warehouseData
          : []
      );

      setGates(
        Array.isArray(gateData)
          ? gateData
          : []
      );

      setProducts(
        Array.isArray(productData?.products)
          ? productData.products
          : []
      );

      setUnits(
        Array.isArray(unitData)
          ? unitData
          : []
      );

      setPackagingList(
        Array.isArray(packagingData)
          ? packagingData
          : []
      );
    } catch (err) {
      console.error(
        "Lỗi tải dữ liệu tạo phiếu nhập:",
        err
      );

      setSuppliers([]);
      setWarehouses([]);
      setGates([]);
      setProducts([]);
      setUnits([]);
      setPackagingList([]);

      setError(
        err.response?.data?.message ||
          "Không thể tải dữ liệu tạo phiếu nhập."
      );
    } finally {
      setLoadingData(false);
    }
  }

  async function loadLocationsByWarehouse(
    warehouseId
  ) {
    try {
      setLoadingLocations(true);
      setError("");

      const data =
        await getWarehouseLocations({
          warehouse_id: warehouseId,
          status: "active",
        });

      setLocations(
        Array.isArray(data)
          ? data
          : []
      );
    } catch (err) {
      console.error(
        "Lỗi tải vị trí kho:",
        err
      );

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
  | Thay đổi thông tin chung
  |--------------------------------------------------------------------------
  */

  function handleFormChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,

      ...(name === "warehouse_id"
        ? {
            gate_id: "",
          }
        : {}),
    }));

    /*
     * Đổi kho thì xóa vị trí cũ.
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
  | Thay đổi một dòng chi tiết
  |--------------------------------------------------------------------------
  */

  function handleDetailChange(
    index,
    event
  ) {
    const { name, value } =
      event.target;

    setDetails((previousDetails) =>
      previousDetails.map(
        (item, itemIndex) => {
          if (itemIndex !== index) {
            return item;
          }

          /*
           * Đổi sản phẩm thì phải chọn lại đơn vị,
           * vì mỗi sản phẩm có quy cách khác nhau.
           */
          if (name === "product_id") {
            return {
              ...item,
              product_id: value,
              unit_id: "",
              quantity: "",
            };
          }

          return {
            ...item,
            [name]: value,
          };
        }
      )
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Thêm dòng sản phẩm
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
        expiry_date: "",
      },
    ]);
  }

  /*
  |--------------------------------------------------------------------------
  | Xóa dòng sản phẩm
  |--------------------------------------------------------------------------
  */

  function removeDetailRow(index) {
    if (details.length === 1) {
      alert(
        "Phiếu nhập phải có ít nhất một sản phẩm."
      );

      return;
    }

    setDetails((previous) =>
      previous.filter(
        (_, itemIndex) =>
          itemIndex !== index
      )
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Lấy các quy cách của một sản phẩm
  |--------------------------------------------------------------------------
  */

  function getProductPackaging(
    productId
  ) {
    if (!productId) {
      return [];
    }

    return packagingList.filter(
      (packaging) =>
        String(packaging.product_id) ===
        String(productId)
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Lấy danh sách đơn vị được cấu hình cho sản phẩm
  |--------------------------------------------------------------------------
  */

  function getAvailableUnits(
    productId
  ) {
    const productPackaging =
      getProductPackaging(productId);

    const allowedUnitIds =
      new Set(
        productPackaging.map(
          (packaging) =>
            String(packaging.unit_id)
        )
      );

    return units.filter((unit) =>
      allowedUnitIds.has(
        String(unit.id)
      )
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Lấy quy cách của dòng đang chọn
  |--------------------------------------------------------------------------
  */

  function getSelectedPackaging(item) {
    if (
      !item.product_id ||
      !item.unit_id
    ) {
      return null;
    }

    return (
      packagingList.find(
        (packaging) =>
          String(
            packaging.product_id
          ) ===
            String(item.product_id) &&
          String(packaging.unit_id) ===
            String(item.unit_id)
      ) || null
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Tính số lượng tồn quy đổi
  |--------------------------------------------------------------------------
  */

  function estimateInventoryQuantity(
    item
  ) {
    const packaging =
      getSelectedPackaging(item);

    const quantity =
      Number(item.quantity);

    const quantityPerUnit =
      Number(
        packaging?.quantity_per_unit
      );

    if (
      !Number.isInteger(quantity) ||
      quantity <= 0 ||
      !Number.isInteger(
        quantityPerUnit
      ) ||
      quantityPerUnit <= 0
    ) {
      return 0;
    }

    return quantity *
      quantityPerUnit;
  }

  /*
  |--------------------------------------------------------------------------
  | Tự động ước tính số container
  |--------------------------------------------------------------------------
  */

  function estimateContainerQuantity(
    item
  ) {
    const packaging =
      getSelectedPackaging(item);

    const quantity =
      Number(item.quantity);

    const unitsPerContainer =
      Number(
        packaging?.units_per_container
      );

    if (
      !Number.isInteger(quantity) ||
      quantity <= 0 ||
      !Number.isInteger(
        unitsPerContainer
      ) ||
      unitsPerContainer <= 0
    ) {
      return 0;
    }

    return Math.ceil(
      quantity /
        unitsPerContainer
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Hiển thị sức chứa vị trí
  |--------------------------------------------------------------------------
  */

  function getLocationOptionText(
    location
  ) {
    const code =
      location.location_code || "";

    const name =
      location.location_name || "";

    const available = Number(
      location.available_containers || 0
    );

    const max = Number(
      location.max_containers || 0
    );

    if (max <= 0) {
      return `${code} - ${name} - chưa cấu hình sức chứa`;
    }

    return `${code} - ${name} - còn ${available} container`;
  }

  /*
  |--------------------------------------------------------------------------
  | Định dạng số
  |--------------------------------------------------------------------------
  */

  function formatNumber(value) {
    return Number(
      value || 0
    ).toLocaleString("vi-VN");
  }

  /*
  |--------------------------------------------------------------------------
  | Tạo phiếu nhập
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

    /*
     * Kiểm tra từng dòng.
     */
    const invalidDetail =
      details.find((item) => {
        const quantity =
          Number(item.quantity);

        const packaging =
          getSelectedPackaging(item);

        const quantityPerUnit =
          Number(
            packaging
              ?.quantity_per_unit
          );

        const unitsPerContainer =
          Number(
            packaging
              ?.units_per_container
          );

        return (
          !item.product_id ||
          !item.unit_id ||
          !item.location_id ||
          !item.batch_code.trim() ||
          !Number.isInteger(quantity) ||
          quantity <= 0 ||
          !packaging ||
          !Number.isInteger(
            quantityPerUnit
          ) ||
          quantityPerUnit <= 0 ||
          !Number.isInteger(
            unitsPerContainer
          ) ||
          unitsPerContainer <= 0
        );
      });

    if (invalidDetail) {
      setError(
        "Vui lòng nhập đầy đủ sản phẩm, đơn vị, vị trí, mã lô và số lượng. Quy cách phải có số lượng quy đổi và sức chứa container hợp lệ."
      );

      return;
    }

    /*
     * Không cho trùng sản phẩm và mã lô.
     */
    const duplicateProductBatch =
      details.some(
        (item, index) =>
          details.findIndex(
            (otherItem) =>
              String(
                otherItem.product_id
              ) ===
                String(
                  item.product_id
                ) &&
              otherItem.batch_code
                .trim()
                .toLowerCase() ===
                item.batch_code
                  .trim()
                  .toLowerCase()
          ) !== index
      );

    if (duplicateProductBatch) {
      setError(
        "Không được nhập trùng cùng một sản phẩm và mã lô trong một phiếu."
      );

      return;
    }

    /*
     * Kiểm tra sơ bộ sức chứa vị trí.
     * Backend vẫn kiểm tra lại chính xác.
     */
    const incomingByLocation =
      new Map();

    for (const item of details) {
      const containerQuantity =
        estimateContainerQuantity(item);

      const locationKey =
        String(item.location_id);

      incomingByLocation.set(
        locationKey,
        Number(
          incomingByLocation.get(
            locationKey
          ) || 0
        ) + containerQuantity
      );
    }

    const exceededLocation =
      locations.find((location) => {
        const maxContainers =
          Number(
            location.max_containers ||
              0
          );

        if (maxContainers <= 0) {
          return false;
        }

        const availableContainers =
          Number(
            location
              .available_containers ||
              0
          );

        const incomingContainers =
          Number(
            incomingByLocation.get(
              String(location.id)
            ) || 0
          );

        return (
          incomingContainers >
          availableContainers
        );
      });

    if (exceededLocation) {
      const incomingContainers =
        Number(
          incomingByLocation.get(
            String(
              exceededLocation.id
            )
          ) || 0
        );

      setError(
        `Vị trí ${
          exceededLocation.location_code
        } chỉ còn ${
          exceededLocation.available_containers
        } container nhưng phiếu cần ${incomingContainers} container.`
      );

      return;
    }

    /*
     * Không gửi container_quantity.
     * Backend tự tính lại để bảo đảm chính xác.
     */
    const payload = {
      supplier_id: Number(
        formData.supplier_id
      ),

      warehouse_id: Number(
        formData.warehouse_id
      ),

      gate_id: Number(
        formData.gate_id
      ),

      import_date:
        formData.import_date,

      note:
        formData.note.trim(),

      details: details.map(
        (item) => ({
          product_id: Number(
            item.product_id
          ),

          unit_id: Number(
            item.unit_id
          ),

          location_id: Number(
            item.location_id
          ),

          batch_code:
            item.batch_code.trim(),

          quantity: Number(
            item.quantity
          ),

          expiry_date:
            item.expiry_date ||
            null,
        })
      ),
    };

    try {
      setSaving(true);

      const result =
        await createStockIn(
          payload
        );

      alert(
        result.message ||
          "Tạo phiếu nhập kho thành công."
      );

      navigate("/stock-ins");
    } catch (err) {
      console.error(
        "Lỗi tạo phiếu nhập:",
        err
      );

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
  | Cổng nhập thuộc kho đang chọn
  |--------------------------------------------------------------------------
  */

  const availableGates =
    gates.filter(
      (gate) =>
        Number(
          gate.warehouse_id
        ) ===
          Number(
            formData.warehouse_id
          ) &&
        ["IN", "BOTH"].includes(
          String(
            gate.gate_type
          ).toUpperCase()
        )
    );

  /*
  |--------------------------------------------------------------------------
  | Tổng container dự kiến
  |--------------------------------------------------------------------------
  */

  const totalEstimatedContainers =
    useMemo(
      () =>
        details.reduce(
          (sum, item) =>
            sum +
            estimateContainerQuantity(
              item
            ),
          0
        ),
      [
        details,
        packagingList,
      ]
    );

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
            Tạo phiếu nhập kho
          </h1>

          <p className="text-muted mb-0">
            Hệ thống tự quy đổi số lượng và tính số container theo quy cách đóng gói.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() =>
            navigate("/stock-ins")
          }
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
                <label
                  className="form-label"
                  htmlFor="stock-in-supplier"
                >
                  Nhà cung cấp
                </label>

                <select
                  id="stock-in-supplier"
                  name="supplier_id"
                  className="form-select"
                  value={
                    formData.supplier_id
                  }
                  onChange={
                    handleFormChange
                  }
                  disabled={saving}
                >
                  <option value="">
                    Chọn nhà cung cấp
                  </option>

                  {suppliers.map(
                    (supplier) => (
                      <option
                        key={supplier.id}
                        value={supplier.id}
                      >
                        {supplier.name}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="col-md-4 mb-3">
                <label
                  className="form-label"
                  htmlFor="stock-in-warehouse"
                >
                  Kho
                </label>

                <select
                  id="stock-in-warehouse"
                  name="warehouse_id"
                  className="form-select"
                  value={
                    formData.warehouse_id
                  }
                  onChange={
                    handleFormChange
                  }
                  disabled={saving}
                >
                  <option value="">
                    Chọn kho
                  </option>

                  {warehouses.map(
                    (warehouse) => (
                      <option
                        key={warehouse.id}
                        value={warehouse.id}
                      >
                        {warehouse.name}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="col-md-4 mb-3">
                <label
                  className="form-label"
                  htmlFor="stock-in-gate"
                >
                  Cổng nhập
                </label>

                <select
                  id="stock-in-gate"
                  name="gate_id"
                  className="form-select"
                  value={
                    formData.gate_id
                  }
                  onChange={
                    handleFormChange
                  }
                  disabled={
                    !formData.warehouse_id ||
                    saving
                  }
                >
                  <option value="">
                    Chọn cổng nhập
                  </option>

                  {availableGates.map(
                    (gate) => (
                      <option
                        key={gate.id}
                        value={gate.id}
                      >
                        {gate.name}
                      </option>
                    )
                  )}
                </select>

                {formData.warehouse_id &&
                  availableGates.length ===
                    0 && (
                    <div className="form-text text-danger">
                      Kho này chưa có cổng
                      nhập phù hợp.
                    </div>
                  )}
              </div>

              <div className="col-md-4 mb-3">
                <label
                  className="form-label"
                  htmlFor="stock-in-date"
                >
                  Ngày nhập
                </label>

                <input
                  id="stock-in-date"
                  type="date"
                  name="import_date"
                  className="form-control"
                  value={
                    formData.import_date
                  }
                  onChange={
                    handleFormChange
                  }
                  disabled={saving}
                />
              </div>

              <div className="col-md-8 mb-3">
                <label
                  className="form-label"
                  htmlFor="stock-in-note"
                >
                  Ghi chú
                </label>

                <input
                  id="stock-in-note"
                  type="text"
                  name="note"
                  className="form-control"
                  value={formData.note}
                  onChange={
                    handleFormChange
                  }
                  placeholder="Nhập ghi chú phiếu nhập"
                  disabled={saving}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Chi tiết sản phẩm */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
              <div>
                <h5 className="card-title mb-1">
                  Chi tiết sản phẩm nhập
                </h5>

                <p className="text-muted mb-0 small">
                  Chọn sản phẩm, quy cách và nhập số lượng. Hệ thống sẽ tự tính số container.
                </p>
              </div>

              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={
                  addDetailRow
                }
                disabled={saving}
              >
                <i className="bi bi-plus-lg me-2" />
                Thêm sản phẩm
              </button>
            </div>

            {!formData.warehouse_id && (
              <div className="alert alert-warning">
                Vui lòng chọn kho trước
                để hệ thống hiển thị vị
                trí lưu trữ.
              </div>
            )}

            {formData.warehouse_id &&
              locations.length === 0 &&
              !loadingLocations && (
                <div className="alert alert-warning">
                  Kho này chưa có vị trí
                  lưu trữ đang hoạt động.
                </div>
              )}

            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th>Sản phẩm</th>
                    <th>Đơn vị</th>
                    <th>Quy đổi</th>
                    <th>Vị trí</th>
                    <th>Mã lô</th>
                    <th>Số lượng nhập</th>
                    <th>Container dự kiến</th>
                    <th>Hạn sử dụng</th>
                    <th />
                  </tr>
                </thead>

                <tbody>
                  {details.map(
                    (item, index) => {
                      const availableUnits =
                        getAvailableUnits(
                          item.product_id
                        );

                      const packaging =
                        getSelectedPackaging(
                          item
                        );

                      const inventoryQuantity =
                        estimateInventoryQuantity(
                          item
                        );

                      const containerQuantity =
                        estimateContainerQuantity(
                          item
                        );

                      return (
                        <tr key={index}>
                          <td
                            style={{
                              minWidth:
                                "230px",
                            }}
                          >
                            <select
                              name="product_id"
                              className="form-select"
                              value={
                                item.product_id
                              }
                              onChange={(
                                event
                              ) =>
                                handleDetailChange(
                                  index,
                                  event
                                )
                              }
                              disabled={
                                saving
                              }
                            >
                              <option value="">
                                Chọn sản phẩm
                              </option>

                              {products.map(
                                (
                                  product
                                ) => {
                                  const hasPackaging =
                                    getProductPackaging(
                                      product.id
                                    ).length >
                                    0;

                                  return (
                                    <option
                                      key={
                                        product.id
                                      }
                                      value={
                                        product.id
                                      }
                                      disabled={
                                        !hasPackaging
                                      }
                                    >
                                      {
                                        product.sku
                                      }{" "}
                                      -{" "}
                                      {
                                        product.name
                                      }
                                      {!hasPackaging
                                        ? " - chưa có quy cách"
                                        : ""}
                                    </option>
                                  );
                                }
                              )}
                            </select>
                          </td>

                          <td
                            style={{
                              minWidth:
                                "150px",
                            }}
                          >
                            <select
                              name="unit_id"
                              className="form-select"
                              value={
                                item.unit_id
                              }
                              onChange={(
                                event
                              ) =>
                                handleDetailChange(
                                  index,
                                  event
                                )
                              }
                              disabled={
                                saving ||
                                !item.product_id
                              }
                            >
                              <option value="">
                                {!item.product_id
                                  ? "Chọn sản phẩm trước"
                                  : availableUnits.length ===
                                      0
                                    ? "Chưa có quy cách"
                                    : "Chọn đơn vị"}
                              </option>

                              {availableUnits.map(
                                (unit) => (
                                  <option
                                    key={
                                      unit.id
                                    }
                                    value={
                                      unit.id
                                    }
                                  >
                                    {
                                      unit.name
                                    }
                                  </option>
                                )
                              )}
                            </select>
                          </td>

                          <td
                            style={{
                              minWidth:
                                "220px",
                            }}
                          >
                            {!packaging ? (
                              <span className="text-muted">
                                Chưa chọn quy cách
                              </span>
                            ) : (
                              <div className="small">
                                <div>
                                  1{" "}
                                  <strong>
                                    {
                                      packaging.unit_name
                                    }
                                  </strong>{" "}
                                  ={" "}
                                  <strong>
                                    {formatNumber(
                                      packaging.quantity_per_unit
                                    )}
                                  </strong>{" "}
                                  đơn vị cơ sở
                                </div>

                                <div>
                                  1 container ={" "}
                                  <strong>
                                    {formatNumber(
                                      packaging.units_per_container
                                    )}
                                  </strong>{" "}
                                  {
                                    packaging.unit_name
                                  }
                                </div>

                                {inventoryQuantity >
                                  0 && (
                                  <div className="text-primary">
                                    Tồn quy đổi:{" "}
                                    <strong>
                                      {formatNumber(
                                        inventoryQuantity
                                      )}
                                    </strong>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          <td
                            style={{
                              minWidth:
                                "250px",
                            }}
                          >
                            <select
                              name="location_id"
                              className="form-select"
                              value={
                                item.location_id
                              }
                              onChange={(
                                event
                              ) =>
                                handleDetailChange(
                                  index,
                                  event
                                )
                              }
                              disabled={
                                !formData.warehouse_id ||
                                loadingLocations ||
                                saving
                              }
                            >
                              <option value="">
                                {loadingLocations
                                  ? "Đang tải vị trí..."
                                  : "Chọn vị trí"}
                              </option>

                              {locations.map(
                                (
                                  location
                                ) => (
                                  <option
                                    key={
                                      location.id
                                    }
                                    value={
                                      location.id
                                    }
                                  >
                                    {getLocationOptionText(
                                      location
                                    )}
                                  </option>
                                )
                              )}
                            </select>
                          </td>

                          <td
                            style={{
                              minWidth:
                                "130px",
                            }}
                          >
                            <input
                              type="text"
                              name="batch_code"
                              maxLength={50}
                              className="form-control"
                              value={
                                item.batch_code
                              }
                              onChange={(
                                event
                              ) =>
                                handleDetailChange(
                                  index,
                                  event
                                )
                              }
                              placeholder="LO-001"
                              disabled={
                                saving
                              }
                            />
                          </td>

                          <td
                            style={{
                              minWidth:
                                "140px",
                            }}
                          >
                            <input
                              type="number"
                              min="1"
                              step="1"
                              name="quantity"
                              className="form-control"
                              value={
                                item.quantity
                              }
                              onChange={(
                                event
                              ) =>
                                handleDetailChange(
                                  index,
                                  event
                                )
                              }
                              disabled={
                                saving ||
                                !item.unit_id
                              }
                            />
                          </td>

                          <td
                            style={{
                              minWidth:
                                "150px",
                            }}
                          >
                            {!item.quantity ||
                            !packaging ? (
                              <span className="text-muted">
                                Chưa tính
                              </span>
                            ) : (
                              <div>
                                <strong className="text-primary fs-5">
                                  {formatNumber(
                                    containerQuantity
                                  )}
                                </strong>{" "}
                                container

                                <div className="small text-muted">
                                  Hệ thống tự tính
                                </div>
                              </div>
                            )}
                          </td>

                          <td
                            style={{
                              minWidth:
                                "155px",
                            }}
                          >
                            <input
                              type="date"
                              name="expiry_date"
                              min={
                                formData.import_date ||
                                undefined
                              }
                              className="form-control"
                              value={
                                item.expiry_date
                              }
                              onChange={(
                                event
                              ) =>
                                handleDetailChange(
                                  index,
                                  event
                                )
                              }
                              disabled={
                                saving
                              }
                            />
                          </td>

                          <td>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() =>
                                removeDetailRow(
                                  index
                                )
                              }
                              disabled={
                                saving
                              }
                            >
                              Xóa
                            </button>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>

            <div className="d-flex justify-content-end mt-3">
              <h5 className="mb-0">
                Tổng container dự kiến:{" "}
                <span className="text-primary">
                  {formatNumber(
                    totalEstimatedContainers
                  )}{" "}
                  container
                </span>
              </h5>
            </div>

            <div className="alert alert-info mb-0 mt-3">
              <strong>
                Cách tính:
              </strong>{" "}
              Số container = số lượng
              nhập chia cho sức chứa một
              container, sau đó làm tròn
              lên. Backend sẽ tính lại
              trước khi lưu.
            </div>
          </div>
        </div>

        <div className="d-flex justify-content-end gap-2">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() =>
              navigate("/stock-ins")
            }
            disabled={saving}
          >
            Hủy
          </button>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={
              saving ||
              !formData.warehouse_id ||
              availableGates.length ===
                0
            }
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
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getWarehouses,
} from "../api/warehouseApi";

import {
  getInventoryBatches,
  getInventorySummary,
} from "../api/inventoryApi";

/*
|--------------------------------------------------------------------------
| Chuyển ngày về timestamp chỉ gồm năm, tháng, ngày
|--------------------------------------------------------------------------
*/

function toDateOnlyTimestamp(value) {
  if (!value) {
    return null;
  }

  const matchedDate = String(value).match(
    /^(\d{4})-(\d{2})-(\d{2})/
  );

  if (matchedDate) {
    return Date.UTC(
      Number(matchedDate[1]),
      Number(matchedDate[2]) - 1,
      Number(matchedDate[3])
    );
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  );
}

function InventoryPage() {
  const [
    batches,
    setBatches,
  ] = useState([]);

  const [
    warehouses,
    setWarehouses,
  ] = useState([]);

  const [
    summary,
    setSummary,
  ] = useState({
    total_batches: 0,
    total_products: 0,
    total_quantity: 0,
    total_containers: 0,

    expired_batches: 0,
    expiring_batches: 0,
    low_stock_products: 0,

    overdue_storage_batches: 0,
    storage_warning_batches: 0,
    no_storage_policy_batches: 0,
  });

  /*
  |--------------------------------------------------------------------------
  | Bộ lọc đang nhập trên giao diện
  |--------------------------------------------------------------------------
  */

  const [
    filters,
    setFilters,
  ] = useState({
    warehouse_id: "",
    keyword: "",
    expiry_status: "",
    stock_status: "",
    storage_status: "",
    sort_by: "priority",
  });

  /*
   * Bộ lọc đã áp dụng để gửi lên backend.
   */
  const [
    appliedFilters,
    setAppliedFilters,
  ] = useState({
    warehouse_id: "",
    keyword: "",
    expiry_status: "",
    stock_status: "",
    storage_status: "",
    sort_by: "priority",
  });

  const [
    pageSize,
    setPageSize,
  ] = useState(10);

  const [
    currentPage,
    setCurrentPage,
  ] = useState(1);

  const [
    pagination,
    setPagination,
  ] = useState({
    page: 1,
    limit: 10,
    total_items: 0,
    total_pages: 1,
    has_previous_page: false,
    has_next_page: false,
  });

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    loadingSummary,
    setLoadingSummary,
  ] = useState(true);

  const [
    loadingWarehouses,
    setLoadingWarehouses,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  /*
  |--------------------------------------------------------------------------
  | Tải tổng quan và danh sách kho
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadSupportingData();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Tải danh sách tồn kho khi trang hoặc bộ lọc thay đổi
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadInventoryBatches();
  }, [
    currentPage,
    pageSize,

    appliedFilters.warehouse_id,
    appliedFilters.keyword,
    appliedFilters.expiry_status,
    appliedFilters.stock_status,
    appliedFilters.storage_status,
    appliedFilters.sort_by,
  ]);

  /*
  |--------------------------------------------------------------------------
  | Tải dữ liệu hỗ trợ
  |--------------------------------------------------------------------------
  */

  async function loadSupportingData() {
    try {
      setLoadingSummary(true);
      setLoadingWarehouses(true);
      setError("");

      const [
        summaryData,
        warehouseData,
      ] = await Promise.all([
        getInventorySummary(),
        getWarehouses(),
      ]);

      setSummary({
        total_batches:
          Number(
            summaryData?.total_batches
          ) || 0,

        total_products:
          Number(
            summaryData?.total_products
          ) || 0,

        total_quantity:
          Number(
            summaryData?.total_quantity
          ) || 0,

        total_containers:
          Number(
            summaryData?.total_containers
          ) || 0,

        expired_batches:
          Number(
            summaryData?.expired_batches
          ) || 0,

        expiring_batches:
          Number(
            summaryData?.expiring_batches
          ) || 0,

        low_stock_products:
          Number(
            summaryData?.low_stock_products
          ) || 0,

        overdue_storage_batches:
          Number(
            summaryData?.overdue_storage_batches
          ) || 0,

        storage_warning_batches:
          Number(
            summaryData?.storage_warning_batches
          ) || 0,

        no_storage_policy_batches:
          Number(
            summaryData?.no_storage_policy_batches
          ) || 0,
      });

      setWarehouses(
        Array.isArray(
          warehouseData
        )
          ? warehouseData
          : []
      );
    } catch (err) {
      console.error(
        "Lỗi tải dữ liệu hỗ trợ tồn kho:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Không thể tải tổng quan tồn kho."
      );
    } finally {
      setLoadingSummary(false);
      setLoadingWarehouses(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Tải danh sách tồn kho
  |--------------------------------------------------------------------------
  */

  async function loadInventoryBatches() {
    try {
      setLoading(true);
      setError("");

      const params = {
        page: currentPage,
        limit: pageSize,

        sort_by:
          appliedFilters.sort_by ||
          "priority",
      };

      if (
        appliedFilters.warehouse_id
      ) {
        params.warehouse_id =
          appliedFilters.warehouse_id;
      }

      if (
        appliedFilters.keyword.trim()
      ) {
        params.keyword =
          appliedFilters.keyword.trim();
      }

      if (
        appliedFilters.expiry_status
      ) {
        params.expiry_status =
          appliedFilters.expiry_status;
      }

      if (
        appliedFilters.stock_status
      ) {
        params.stock_status =
          appliedFilters.stock_status;
      }

      if (
        appliedFilters.storage_status
      ) {
        params.storage_status =
          appliedFilters.storage_status;
      }

      const data =
        await getInventoryBatches(
          params
        );

      const batchRows =
        Array.isArray(
          data?.batches
        )
          ? data.batches
          : [];

      const paginationData =
        data?.pagination || {};

      setBatches(batchRows);

      const responsePage =
        Number(
          paginationData.page ||
            currentPage
        );

      setPagination({
        page: responsePage,

        limit:
          Number(
            paginationData.limit ||
              pageSize
          ),

        total_items:
          Number(
            paginationData.total_items ||
              0
          ),

        total_pages:
          Math.max(
            1,
            Number(
              paginationData.total_pages ||
                1
            )
          ),

        has_previous_page:
          Boolean(
            paginationData
              .has_previous_page
          ),

        has_next_page:
          Boolean(
            paginationData
              .has_next_page
          ),
      });

      if (
        paginationData.page &&
        responsePage !== currentPage
      ) {
        setCurrentPage(
          responsePage
        );
      }
    } catch (err) {
      console.error(
        "Lỗi tải tồn kho:",
        err
      );

      setBatches([]);

      setPagination({
        page: 1,
        limit: pageSize,
        total_items: 0,
        total_pages: 1,
        has_previous_page: false,
        has_next_page: false,
      });

      setError(
        err.response?.data?.message ||
          "Không thể tải dữ liệu tồn kho."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Thay đổi bộ lọc
  |--------------------------------------------------------------------------
  */

  function handleFilterChange(
    event
  ) {
    const {
      name,
      value,
    } = event.target;

    setFilters(
      (previous) => ({
        ...previous,
        [name]: value,
      })
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Áp dụng bộ lọc
  |--------------------------------------------------------------------------
  */

  function handleSearch(event) {
    event.preventDefault();

    setCurrentPage(1);

    setAppliedFilters({
      warehouse_id:
        filters.warehouse_id,

      keyword:
        filters.keyword.trim(),

      expiry_status:
        filters.expiry_status,

      stock_status:
        filters.stock_status,

      storage_status:
        filters.storage_status,

      sort_by:
        filters.sort_by,
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Đặt lại bộ lọc
  |--------------------------------------------------------------------------
  */

  function handleResetFilters() {
    const defaultFilters = {
      warehouse_id: "",
      keyword: "",
      expiry_status: "",
      stock_status: "",
      storage_status: "",
      sort_by: "priority",
    };

    setFilters(
      defaultFilters
    );

    setAppliedFilters(
      defaultFilters
    );

    setPageSize(10);
    setCurrentPage(1);
  }

  /*
  |--------------------------------------------------------------------------
  | Đổi số dòng mỗi trang
  |--------------------------------------------------------------------------
  */

  function handlePageSizeChange(
    event
  ) {
    setPageSize(
      Number(
        event.target.value
      )
    );

    setCurrentPage(1);
  }

  /*
  |--------------------------------------------------------------------------
  | Định dạng dữ liệu
  |--------------------------------------------------------------------------
  */

  function formatNumber(value) {
    return Number(
      value || 0
    ).toLocaleString(
      "vi-VN"
    );
  }

  function formatCurrency(value) {
    return Number(
      value || 0
    ).toLocaleString(
      "vi-VN",
      {
        style: "currency",
        currency: "VND",
      }
    );
  }

  function formatDate(value) {
    const timestamp =
      toDateOnlyTimestamp(
        value
      );

    if (timestamp === null) {
      return "Không có";
    }

    return new Date(
      timestamp
    ).toLocaleDateString(
      "vi-VN",
      {
        timeZone: "UTC",
      }
    );
  }

  function formatMultiplier(value) {
    const multiplier =
      Number(value || 1);

    return `${multiplier.toLocaleString(
      "vi-VN",
      {
        maximumFractionDigits:
          2,
      }
    )} lần`;
  }

  /*
  |--------------------------------------------------------------------------
  | Lấy tên vị trí
  |--------------------------------------------------------------------------
  */

  function getLocationName(batch) {
    if (
      batch.location_code &&
      batch.location_name
    ) {
      return `${batch.location_code} - ${batch.location_name}`;
    }

    if (batch.location_code) {
      return batch.location_code;
    }

    if (batch.location_name) {
      return batch.location_name;
    }

    return "Chưa có vị trí";
  }

  /*
  |--------------------------------------------------------------------------
  | Badge hạn sử dụng
  |--------------------------------------------------------------------------
  */

  function getExpiryBadge(batch) {
    if (
      batch.expiry_status ===
      "expired"
    ) {
      return (
        <span className="badge bg-danger">
          Đã hết hạn
        </span>
      );
    }

    if (
      batch.expiry_status ===
      "expiring"
    ) {
      return (
        <span className="badge bg-warning text-dark">
          Sắp hết hạn
        </span>
      );
    }

    if (
      batch.expiry_status ===
      "valid"
    ) {
      return (
        <span className="badge bg-success">
          Còn hạn
        </span>
      );
    }

    return (
      <span className="badge bg-secondary">
        Không có hạn dùng
      </span>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Badge trạng thái tồn kho
  |--------------------------------------------------------------------------
  */

  function getStockBadge(batch) {
    if (
      batch.stock_status ===
      "low_stock"
    ) {
      return (
        <span className="badge bg-danger">
          <i className="bi bi-exclamation-triangle me-1" />

          Tồn kho thấp
        </span>
      );
    }

    if (
      batch.stock_status ===
      "normal"
    ) {
      return (
        <span className="badge bg-success">
          Tồn kho ổn định
        </span>
      );
    }

    return (
      <span className="badge bg-secondary">
        Chưa thiết lập
      </span>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Badge trạng thái lưu kho
  |--------------------------------------------------------------------------
  */

  function getStorageBadge(batch) {
    if (
      batch.storage_status ===
      "overdue"
    ) {
      return (
        <span className="badge bg-danger">
          <i className="bi bi-clock-history me-1" />

          Đã quá hạn lưu
        </span>
      );
    }

    if (
      batch.storage_status ===
      "warning"
    ) {
      return (
        <span className="badge bg-warning text-dark">
          <i className="bi bi-exclamation-circle me-1" />

          Sắp quá hạn lưu
        </span>
      );
    }

    if (
      batch.storage_status ===
      "normal"
    ) {
      return (
        <span className="badge bg-success">
          Trong thời hạn
        </span>
      );
    }

    return (
      <span className="badge bg-secondary">
        Chưa có chính sách
      </span>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Nội dung số ngày lưu còn lại hoặc quá hạn
  |--------------------------------------------------------------------------
  */

  function getStorageDayText(batch) {
    if (
      batch.storage_status ===
      "no_policy"
    ) {
      return (
        <span className="text-muted">
          Chưa xác định
        </span>
      );
    }

    const daysUntilDue =
      batch.days_until_storage_due ===
        null ||
      batch.days_until_storage_due ===
        undefined
        ? null
        : Number(
            batch.days_until_storage_due
          );

    const overdueDays =
      Number(
        batch.overdue_storage_days ||
          0
      );

    if (
      batch.storage_status ===
      "overdue"
    ) {
      return (
        <span className="text-danger fw-semibold">
          Quá hạn{" "}
          {formatNumber(
            overdueDays
          )}{" "}
          ngày
        </span>
      );
    }

    if (
      daysUntilDue === null
    ) {
      return (
        <span className="text-muted">
          Chưa xác định
        </span>
      );
    }

    if (daysUntilDue === 0) {
      return (
        <span className="text-warning-emphasis fw-semibold">
          Hết hạn lưu hôm nay
        </span>
      );
    }

    if (
      batch.storage_status ===
      "warning"
    ) {
      return (
        <span className="text-warning-emphasis fw-semibold">
          Còn{" "}
          {formatNumber(
            daysUntilDue
          )}{" "}
          ngày
        </span>
      );
    }

    return (
      <span className="text-success">
        Còn{" "}
        {formatNumber(
          daysUntilDue
        )}{" "}
        ngày
      </span>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Trạng thái cho phép xuất quá hạn
  |--------------------------------------------------------------------------
  */

  function getOverdueExportRule(
    batch
  ) {
    if (
      batch.storage_status ===
      "no_policy"
    ) {
      return (
        <span className="text-muted">
          Chưa có quy định
        </span>
      );
    }

    if (
      batch.allow_overdue_export ===
      true
    ) {
      return (
        <div>
          <span className="badge bg-success">
            Được xuất quá hạn
          </span>

          {batch.require_overdue_note ===
            true && (
            <div className="small text-danger mt-1">
              Bắt buộc ghi chú
            </div>
          )}

          {batch.require_overdue_note ===
            false && (
            <div className="small text-muted mt-1">
              Không bắt buộc ghi chú
            </div>
          )}
        </div>
      );
    }

    return (
      <span className="badge bg-danger">
        Không được xuất quá hạn
      </span>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Màu dòng theo mức ưu tiên
  |--------------------------------------------------------------------------
  */

  function getBatchRowClass(
    batch
  ) {
    if (
      batch.storage_status ===
      "overdue"
    ) {
      return "table-danger";
    }

    if (
      batch.storage_status ===
      "warning"
    ) {
      return "table-warning";
    }

    if (
      batch.storage_status ===
      "no_policy"
    ) {
      return "table-secondary";
    }

    if (batch.is_low_stock) {
      return "table-info";
    }

    return "";
  }

  /*
  |--------------------------------------------------------------------------
  | Thông tin phân trang
  |--------------------------------------------------------------------------
  */

  const totalItems =
    pagination.total_items;

  const totalPages =
    pagination.total_pages;

  const firstItemNumber =
    totalItems === 0
      ? 0
      : (
          currentPage - 1
        ) *
          pageSize +
        1;

  const lastItemNumber =
    Math.min(
      currentPage *
        pageSize,
      totalItems
    );

  /*
  |--------------------------------------------------------------------------
  | Chỉ hiển thị tối đa 5 nút trang
  |--------------------------------------------------------------------------
  */

  const visiblePages =
    useMemo(() => {
      const maximumVisiblePages =
        5;

      let startPage =
        Math.max(
          1,

          currentPage -
            Math.floor(
              maximumVisiblePages /
                2
            )
        );

      let endPage =
        Math.min(
          totalPages,

          startPage +
            maximumVisiblePages -
            1
        );

      startPage =
        Math.max(
          1,

          endPage -
            maximumVisiblePages +
            1
        );

      const pages = [];

      for (
        let page = startPage;
        page <= endPage;
        page += 1
      ) {
        pages.push(page);
      }

      return pages;
    }, [
      currentPage,
      totalPages,
    ]);

  return (
    <div>
      {/* Tiêu đề */}
      <div className="mb-4">
        <h1 className="h4 mb-1">
          Quản lý tồn kho
        </h1>

        <p className="text-muted mb-0">
          Theo dõi tồn kho theo lô, container, hạn sử dụng và thời hạn lưu kho.
        </p>
      </div>

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      {/* Các thẻ thống kê */}
      <div className="row g-3 mb-4">
        <div className="col-md-4 col-xl-2">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted small">
                Sản phẩm còn tồn
              </div>

              <div className="fs-4 fw-bold">
                {loadingSummary
                  ? "..."
                  : formatNumber(
                      summary.total_products
                    )}
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4 col-xl-2">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted small">
                Tổng số lô
              </div>

              <div className="fs-4 fw-bold">
                {loadingSummary
                  ? "..."
                  : formatNumber(
                      summary.total_batches
                    )}
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4 col-xl-2">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted small">
                Tổng số lượng
              </div>

              <div className="fs-4 fw-bold">
                {loadingSummary
                  ? "..."
                  : formatNumber(
                      summary.total_quantity
                    )}
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4 col-xl-2">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted small">
                Tổng container
              </div>

              <div className="fs-4 fw-bold text-primary">
                {loadingSummary
                  ? "..."
                  : formatNumber(
                      summary.total_containers
                    )}
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4 col-xl-2">
          <div
            className={`card shadow-sm h-100 ${
              summary
                .low_stock_products >
              0
                ? "border-danger"
                : "border-0"
            }`}
          >
            <div className="card-body">
              <div className="text-muted small">
                Sản phẩm tồn thấp
              </div>

              <div
                className={`fs-4 fw-bold ${
                  summary
                    .low_stock_products >
                  0
                    ? "text-danger"
                    : "text-success"
                }`}
              >
                {loadingSummary
                  ? "..."
                  : formatNumber(
                      summary
                        .low_stock_products
                    )}
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4 col-xl-2">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted small">
                Lô sắp hết hạn dùng
              </div>

              <div className="fs-4 fw-bold text-warning">
                {loadingSummary
                  ? "..."
                  : formatNumber(
                      summary.expiring_batches
                    )}
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4 col-xl-2">
          <div
            className={`card shadow-sm h-100 ${
              summary
                .storage_warning_batches >
              0
                ? "border-warning"
                : "border-0"
            }`}
          >
            <div className="card-body">
              <div className="text-muted small">
                Sắp quá hạn lưu
              </div>

              <div className="fs-4 fw-bold text-warning">
                {loadingSummary
                  ? "..."
                  : formatNumber(
                      summary
                        .storage_warning_batches
                    )}
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4 col-xl-2">
          <div
            className={`card shadow-sm h-100 ${
              summary
                .overdue_storage_batches >
              0
                ? "border-danger"
                : "border-0"
            }`}
          >
            <div className="card-body">
              <div className="text-muted small">
                Đã quá hạn lưu
              </div>

              <div className="fs-4 fw-bold text-danger">
                {loadingSummary
                  ? "..."
                  : formatNumber(
                      summary
                        .overdue_storage_batches
                    )}
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4 col-xl-2">
          <div
            className={`card shadow-sm h-100 ${
              summary
                .no_storage_policy_batches >
              0
                ? "border-secondary"
                : "border-0"
            }`}
          >
            <div className="card-body">
              <div className="text-muted small">
                Chưa có chính sách
              </div>

              <div className="fs-4 fw-bold text-secondary">
                {loadingSummary
                  ? "..."
                  : formatNumber(
                      summary
                        .no_storage_policy_batches
                    )}
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4 col-xl-2">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted small">
                Lô đã hết hạn dùng
              </div>

              <div className="fs-4 fw-bold text-danger">
                {loadingSummary
                  ? "..."
                  : formatNumber(
                      summary.expired_batches
                    )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bộ lọc */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <form
            onSubmit={
              handleSearch
            }
          >
            <div className="row g-3 align-items-end">
              <div className="col-xl-3 col-md-6">
                <label
                  className="form-label"
                  htmlFor="inventory-keyword"
                >
                  Tìm kiếm
                </label>

                <input
                  id="inventory-keyword"
                  type="search"
                  name="keyword"
                  className="form-control"
                  value={
                    filters.keyword
                  }
                  onChange={
                    handleFilterChange
                  }
                  placeholder="Tên sản phẩm, SKU, mã lô, kho, vị trí hoặc chính sách"
                />
              </div>

              <div className="col-xl-2 col-md-6">
                <label
                  className="form-label"
                  htmlFor="inventory-warehouse"
                >
                  Kho
                </label>

                <select
                  id="inventory-warehouse"
                  name="warehouse_id"
                  className="form-select"
                  value={
                    filters.warehouse_id
                  }
                  disabled={
                    loadingWarehouses
                  }
                  onChange={
                    handleFilterChange
                  }
                >
                  <option value="">
                    {loadingWarehouses
                      ? "Đang tải kho..."
                      : "Tất cả kho"}
                  </option>

                  {warehouses.map(
                    (warehouse) => (
                      <option
                        key={
                          warehouse.id
                        }
                        value={
                          warehouse.id
                        }
                      >
                        {
                          warehouse.name
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="col-xl-2 col-md-6">
                <label
                  className="form-label"
                  htmlFor="inventory-expiry-status"
                >
                  Hạn sử dụng
                </label>

                <select
                  id="inventory-expiry-status"
                  name="expiry_status"
                  className="form-select"
                  value={
                    filters.expiry_status
                  }
                  onChange={
                    handleFilterChange
                  }
                >
                  <option value="">
                    Tất cả
                  </option>

                  <option value="valid">
                    Còn hạn
                  </option>

                  <option value="expiring">
                    Sắp hết hạn
                  </option>

                  <option value="expired">
                    Đã hết hạn
                  </option>

                  <option value="no_expiry">
                    Không có hạn dùng
                  </option>
                </select>
              </div>

              <div className="col-xl-2 col-md-6">
                <label
                  className="form-label"
                  htmlFor="inventory-stock-status"
                >
                  Trạng thái tồn
                </label>

                <select
                  id="inventory-stock-status"
                  name="stock_status"
                  className="form-select"
                  value={
                    filters.stock_status
                  }
                  onChange={
                    handleFilterChange
                  }
                >
                  <option value="">
                    Tất cả trạng thái
                  </option>

                  <option value="low_stock">
                    Tồn kho thấp
                  </option>

                  <option value="normal">
                    Tồn kho ổn định
                  </option>

                  <option value="not_configured">
                    Chưa thiết lập cảnh báo
                  </option>
                </select>
              </div>

              <div className="col-xl-2 col-md-6">
                <label
                  className="form-label"
                  htmlFor="inventory-storage-status"
                >
                  Thời hạn lưu
                </label>

                <select
                  id="inventory-storage-status"
                  name="storage_status"
                  className="form-select"
                  value={
                    filters.storage_status
                  }
                  onChange={
                    handleFilterChange
                  }
                >
                  <option value="">
                    Tất cả trạng thái
                  </option>

                  <option value="normal">
                    Trong thời hạn
                  </option>

                  <option value="warning">
                    Sắp quá hạn lưu
                  </option>

                  <option value="overdue">
                    Đã quá hạn lưu
                  </option>

                  <option value="no_policy">
                    Chưa có chính sách
                  </option>
                </select>
              </div>

              <div className="col-xl-3 col-md-6">
                <label
                  className="form-label"
                  htmlFor="inventory-sort"
                >
                  Sắp xếp
                </label>

                <select
                  id="inventory-sort"
                  name="sort_by"
                  className="form-select"
                  value={
                    filters.sort_by
                  }
                  onChange={
                    handleFilterChange
                  }
                >
                  <option value="priority">
                    Ưu tiên lô cần xử lý
                  </option>

                  <option value="storage_due_asc">
                    Hạn lưu gần nhất
                  </option>

                  <option value="storage_due_desc">
                    Hạn lưu xa nhất
                  </option>

                  <option value="expiry_asc">
                    Hạn sử dụng gần nhất
                  </option>

                  <option value="expiry_desc">
                    Hạn sử dụng xa nhất
                  </option>

                  <option value="quantity_desc">
                    Số lượng lô cao nhất
                  </option>

                  <option value="quantity_asc">
                    Số lượng lô thấp nhất
                  </option>

                  <option value="newest">
                    Lô mới nhất
                  </option>

                  <option value="oldest">
                    Lô cũ nhất
                  </option>
                </select>
              </div>

              <div className="col-xl-2 col-md-6">
                <label
                  className="form-label"
                  htmlFor="inventory-page-size"
                >
                  Số dòng
                </label>

                <select
                  id="inventory-page-size"
                  className="form-select"
                  value={pageSize}
                  onChange={
                    handlePageSizeChange
                  }
                >
                  <option value={5}>
                    5 dòng
                  </option>

                  <option value={10}>
                    10 dòng
                  </option>

                  <option value={20}>
                    20 dòng
                  </option>

                  <option value={50}>
                    50 dòng
                  </option>
                </select>
              </div>

              <div className="col-xl-3 col-md-6">
                <div className="d-flex gap-2">
                  <button
                    type="submit"
                    className="btn btn-primary flex-grow-1"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                        />

                        Đang lọc
                      </>
                    ) : (
                      <>
                        <i className="bi bi-funnel me-2" />

                        Lọc dữ liệu
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    disabled={loading}
                    onClick={
                      handleResetFilters
                    }
                    title="Đặt lại bộ lọc"
                  >
                    <i className="bi bi-arrow-counterclockwise" />
                  </button>
                </div>
              </div>

              <div className="col-xl-3 col-md-12">
                <div className="text-muted">
                  Tìm thấy{" "}
                  <strong className="text-dark">
                    {formatNumber(
                      totalItems
                    )}
                  </strong>{" "}
                  lô hàng
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Danh sách tồn kho */}
      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <h5 className="card-title mb-3">
            Danh sách tồn kho theo lô
          </h5>

          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>
                    STT
                  </th>

                  <th>
                    Sản phẩm
                  </th>

                  <th>
                    Kho và vị trí
                  </th>

                  <th>
                    Mã lô
                  </th>

                  <th>
                    Tồn trong lô
                  </th>

                  <th>
                    Tổng tồn / Tối thiểu
                  </th>

                  <th>
                    Trạng thái tồn
                  </th>

                  <th>
                    Ngày nhập
                  </th>

                  <th>
                    Hạn sử dụng
                  </th>

                  <th>
                    Chính sách lưu kho
                  </th>

                  <th>
                    Thời hạn lưu kho
                  </th>

                  <th>
                    Trạng thái lưu kho
                  </th>

                  <th>
                    Quy định xuất quá hạn
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan="13"
                      className="text-center text-muted py-5"
                    >
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                      />

                      Đang tải dữ liệu tồn kho...
                    </td>
                  </tr>
                ) : batches.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan="13"
                      className="text-center text-muted py-5"
                    >
                      <i className="bi bi-box-seam fs-2 d-block mb-2" />

                      Không có dữ liệu tồn kho phù hợp.
                    </td>
                  </tr>
                ) : (
                  batches.map(
                    (
                      batch,
                      index
                    ) => (
                      <tr
                        key={
                          batch.id
                        }
                        className={
                          getBatchRowClass(
                            batch
                          )
                        }
                      >
                        <td>
                          {firstItemNumber +
                            index}
                        </td>

                        <td
                          style={{
                            minWidth:
                              "210px",
                          }}
                        >
                          <strong>
                            {
                              batch.product_name
                            }
                          </strong>

                          <div className="text-muted small">
                            SKU:{" "}
                            {batch.sku ||
                              "Không có"}
                          </div>

                          {getExpiryBadge(
                            batch
                          )}
                        </td>

                        <td
                          style={{
                            minWidth:
                              "190px",
                          }}
                        >
                          <strong>
                            {batch.warehouse_name ||
                              "Không có"}
                          </strong>

                          <div className="small text-muted">
                            {getLocationName(
                              batch
                            )}
                          </div>
                        </td>

                        <td className="text-nowrap">
                          <span className="fw-semibold">
                            {batch.batch_code ||
                              "Không có"}
                          </span>
                        </td>

                        <td
                          style={{
                            minWidth:
                              "145px",
                          }}
                        >
                          <div>
                            Số lượng:{" "}
                            <strong>
                              {formatNumber(
                                batch.quantity
                              )}
                            </strong>
                          </div>

                          <div className="small text-primary">
                            {formatNumber(
                              batch.container_quantity
                            )}{" "}
                            container
                          </div>

                          {batch.is_container_consistent ===
                            false && (
                            <div className="small text-danger fw-semibold">
                              Dữ liệu container không khớp
                            </div>
                          )}
                        </td>

                        <td
                          style={{
                            minWidth:
                              "155px",
                          }}
                        >
                          <div>
                            <strong
                              className={
                                batch.is_low_stock
                                  ? "text-danger"
                                  : ""
                              }
                            >
                              {formatNumber(
                                batch.total_product_quantity
                              )}
                            </strong>

                            <span className="text-muted mx-1">
                              /
                            </span>

                            <span>
                              {formatNumber(
                                batch.minimum_stock
                              )}
                            </span>
                          </div>

                          <div className="text-muted small">
                            Hiện tại / Tối thiểu
                          </div>
                        </td>

                        <td>
                          {getStockBadge(
                            batch
                          )}
                        </td>

                        <td className="text-nowrap">
                          {formatDate(
                            batch.import_date
                          )}
                        </td>

                        <td
                          style={{
                            minWidth:
                              "170px",
                          }}
                        >
                          <div>
                            {formatDate(
                              batch.expiry_date
                            )}
                          </div>

                          {batch.days_until_expiry !==
                            null &&
                            batch.days_until_expiry !==
                              undefined && (
                              <div className="text-muted small">
                                {Number(
                                  batch.days_until_expiry
                                ) < 0
                                  ? `Đã quá ${formatNumber(
                                      Math.abs(
                                        Number(
                                          batch.days_until_expiry
                                        )
                                      )
                                    )} ngày`
                                  : Number(
                                        batch.days_until_expiry
                                      ) ===
                                      0
                                    ? "Hết hạn hôm nay"
                                    : `Còn ${formatNumber(
                                        batch.days_until_expiry
                                      )} ngày`}
                              </div>
                            )}
                        </td>

                        <td
                          style={{
                            minWidth:
                              "210px",
                          }}
                        >
                          {batch.storage_policy_id ? (
                            <>
                              <strong>
                                {batch.policy_name ||
                                  "Chính sách lưu kho"}
                              </strong>

                              <div className="small text-muted">
                                Mã:{" "}
                                {batch.policy_code ||
                                  "Không có"}
                              </div>

                              <div className="small text-muted">
                                Tối đa:{" "}
                                {formatNumber(
                                  batch.max_storage_days
                                )}{" "}
                                ngày
                              </div>

                              <div className="small text-muted">
                                Cảnh báo trước:{" "}
                                {formatNumber(
                                  batch.warning_days
                                )}{" "}
                                ngày
                              </div>
                            </>
                          ) : (
                            <span className="text-danger">
                              Chưa có chính sách
                            </span>
                          )}
                        </td>

                        <td
                          style={{
                            minWidth:
                              "190px",
                          }}
                        >
                          <div>
                            Ngày cuối trong hạn:
                          </div>

                          <strong>
                            {formatDate(
                              batch.storage_due_date
                            )}
                          </strong>

                          <div className="small mt-1">
                            {getStorageDayText(
                              batch
                            )}
                          </div>

                          <div className="small text-muted mt-1">
                            Hệ số quá hạn:{" "}
                            {formatMultiplier(
                              batch.overdue_multiplier
                            )}
                          </div>

                          <div className="small text-muted">
                            Đơn giá:{" "}
                            {formatCurrency(
                              batch.storage_unit_price
                            )}
                            /container/ngày
                          </div>
                        </td>

                        <td>
                          {getStorageBadge(
                            batch
                          )}
                        </td>

                        <td
                          style={{
                            minWidth:
                              "180px",
                          }}
                        >
                          {getOverdueExportRule(
                            batch
                          )}
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>

          {/* Phân trang */}
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 border-top pt-3 mt-2">
            <div className="text-muted small">
              Hiển thị{" "}
              <strong>
                {formatNumber(
                  firstItemNumber
                )}
              </strong>{" "}
              đến{" "}
              <strong>
                {formatNumber(
                  lastItemNumber
                )}
              </strong>{" "}
              trên tổng{" "}
              <strong>
                {formatNumber(
                  totalItems
                )}
              </strong>{" "}
              lô hàng
            </div>

            <nav aria-label="Phân trang tồn kho">
              <ul className="pagination pagination-sm mb-0">
                <li
                  className={`page-item ${
                    currentPage === 1
                      ? "disabled"
                      : ""
                  }`}
                >
                  <button
                    type="button"
                    className="page-link"
                    disabled={
                      currentPage ===
                        1 ||
                      loading
                    }
                    onClick={() =>
                      setCurrentPage(
                        (
                          previousPage
                        ) =>
                          Math.max(
                            1,
                            previousPage -
                              1
                          )
                      )
                    }
                  >
                    <i className="bi bi-chevron-left me-1" />

                    Trước
                  </button>
                </li>

                {visiblePages.map(
                  (page) => (
                    <li
                      key={page}
                      className={`page-item ${
                        currentPage ===
                        page
                          ? "active"
                          : ""
                      }`}
                    >
                      <button
                        type="button"
                        className="page-link"
                        disabled={loading}
                        onClick={() =>
                          setCurrentPage(
                            page
                          )
                        }
                      >
                        {page}
                      </button>
                    </li>
                  )
                )}

                <li
                  className={`page-item ${
                    currentPage ===
                    totalPages
                      ? "disabled"
                      : ""
                  }`}
                >
                  <button
                    type="button"
                    className="page-link"
                    disabled={
                      currentPage ===
                        totalPages ||
                      loading
                    }
                    onClick={() =>
                      setCurrentPage(
                        (
                          previousPage
                        ) =>
                          Math.min(
                            totalPages,
                            previousPage +
                              1
                          )
                      )
                    }
                  >
                    Sau

                    <i className="bi bi-chevron-right ms-1" />
                  </button>
                </li>
              </ul>
            </nav>
          </div>

          <div className="alert alert-info mb-0 mt-3">
            <strong>
              Quy ước màu:
            </strong>{" "}
            Dòng màu đỏ là lô đã quá hạn lưu, màu vàng là lô sắp quá hạn lưu, màu xám là lô chưa có chính sách và màu xanh nhạt là sản phẩm tồn thấp.
          </div>
        </div>
      </div>
    </div>
  );
}

export default InventoryPage;
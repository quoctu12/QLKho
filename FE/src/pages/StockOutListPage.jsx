import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getStockOuts } from "../api/stockOutApi";
import { getWarehouses } from "../api/warehouseApi";

function StockOutListPage() {
  const navigate = useNavigate();

  const [stockOuts, setStockOuts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingWarehouses, setLoadingWarehouses] = useState(true);
  const [error, setError] = useState("");

  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");

  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [exportRuleFilter, setExportRuleFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total_items: 0,
    total_pages: 1,
    has_previous_page: false,
    has_next_page: false,
  });

  /*
  |--------------------------------------------------------------------------
  | Tải danh sách kho
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadWarehouses();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Trì hoãn tìm kiếm 400ms
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedKeyword(keyword.trim());
    }, 400);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [keyword]);

  /*
  |--------------------------------------------------------------------------
  | Khi thay đổi bộ lọc thì quay lại trang đầu
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    setCurrentPage(1);
  }, [
    debouncedKeyword,
    warehouseFilter,
    exportRuleFilter,
    dateFrom,
    dateTo,
    sortBy,
    pageSize,
  ]);

  /*
  |--------------------------------------------------------------------------
  | Tải danh sách phiếu xuất
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadStockOuts();
  }, [
    currentPage,
    pageSize,
    debouncedKeyword,
    warehouseFilter,
    exportRuleFilter,
    dateFrom,
    dateTo,
    sortBy,
  ]);

  async function loadWarehouses() {
    try {
      setLoadingWarehouses(true);

      const data = await getWarehouses();

      setWarehouses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Lỗi tải danh sách kho:", err);
      setWarehouses([]);
    } finally {
      setLoadingWarehouses(false);
    }
  }

  async function loadStockOuts() {
    try {
      setLoading(true);
      setError("");

      const data = await getStockOuts({
        page: currentPage,
        limit: pageSize,
        keyword: debouncedKeyword || undefined,
        warehouse_id: warehouseFilter || undefined,
        export_rule: exportRuleFilter || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        sort_by: sortBy,
      });

      const stockOutRows = Array.isArray(data?.stock_outs)
        ? data.stock_outs
        : [];

      const paginationData = data?.pagination || {};

      setStockOuts(stockOutRows);

      setPagination({
        page: Number(paginationData.page || currentPage),
        limit: Number(paginationData.limit || pageSize),
        total_items: Number(paginationData.total_items || 0),
        total_pages: Math.max(
          1,
          Number(paginationData.total_pages || 1)
        ),
        has_previous_page: Boolean(
          paginationData.has_previous_page
        ),
        has_next_page: Boolean(
          paginationData.has_next_page
        ),
      });
    } catch (err) {
      console.error("Lỗi tải phiếu xuất:", err);

      setStockOuts([]);

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
          "Không thể tải danh sách phiếu xuất."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Đặt lại bộ lọc
  |--------------------------------------------------------------------------
  */

  function handleResetFilters() {
    setKeyword("");
    setDebouncedKeyword("");
    setWarehouseFilter("");
    setExportRuleFilter("");
    setDateFrom("");
    setDateTo("");
    setSortBy("newest");
    setPageSize(10);
    setCurrentPage(1);
  }

  /*
  |--------------------------------------------------------------------------
  | Format dữ liệu
  |--------------------------------------------------------------------------
  */

  function formatCurrency(value) {
    return Number(value || 0).toLocaleString("vi-VN", {
      style: "currency",
      currency: "VND",
    });
  }

  function formatNumber(value) {
    return Number(value || 0).toLocaleString("vi-VN");
  }

  function formatDate(value) {
    if (!value) {
      return "Không có";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Không hợp lệ";
    }

    return date.toLocaleDateString("vi-VN");
  }

  const totalItems = pagination.total_items;
  const totalPages = pagination.total_pages;

  const firstItemNumber =
    totalItems === 0
      ? 0
      : (currentPage - 1) * pageSize + 1;

  const lastItemNumber = Math.min(
    currentPage * pageSize,
    totalItems
  );

  /*
  |--------------------------------------------------------------------------
  | Hiển thị tối đa 5 nút trang
  |--------------------------------------------------------------------------
  */

  const visiblePages = useMemo(() => {
    const maximumVisiblePages = 5;

    let startPage = Math.max(
      1,
      currentPage - Math.floor(maximumVisiblePages / 2)
    );

    let endPage = Math.min(
      totalPages,
      startPage + maximumVisiblePages - 1
    );

    startPage = Math.max(
      1,
      endPage - maximumVisiblePages + 1
    );

    const pages = [];

    for (let page = startPage; page <= endPage; page += 1) {
      pages.push(page);
    }

    return pages;
  }, [currentPage, totalPages]);

  return (
    <div>
      {/* Tiêu đề */}
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
        <div>
          <h1 className="h4 mb-1">
            Quản lý xuất kho
          </h1>

          <p className="text-muted mb-0">
            Theo dõi phiếu xuất, container xuất và tổng phí lưu kho.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => navigate("/stock-outs/create")}
        >
          <i className="bi bi-plus-lg me-2" />
          Tạo phiếu xuất
        </button>
      </div>

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      {/* Bộ lọc */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-xl-4 col-lg-6">
              <label
                className="form-label"
                htmlFor="stock-out-keyword"
              >
                Tìm kiếm
              </label>

              <div className="input-group">
                <span className="input-group-text bg-white">
                  <i className="bi bi-search" />
                </span>

                <input
                  id="stock-out-keyword"
                  type="search"
                  className="form-control"
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="Mã phiếu, kho, cổng hoặc người tạo"
                />
              </div>
            </div>

            <div className="col-xl-3 col-lg-6">
              <label
                className="form-label"
                htmlFor="stock-out-warehouse-filter"
              >
                Kho
              </label>

              <select
                id="stock-out-warehouse-filter"
                className="form-select"
                value={warehouseFilter}
                disabled={loadingWarehouses}
                onChange={(event) =>
                  setWarehouseFilter(event.target.value)
                }
              >
                <option value="">
                  {loadingWarehouses ? "Đang tải kho..." : "Tất cả kho"}
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

            <div className="col-xl-2 col-lg-6">
              <label
                className="form-label"
                htmlFor="stock-out-rule-filter"
              >
                Quy tắc
              </label>

              <select
                id="stock-out-rule-filter"
                className="form-select"
                value={exportRuleFilter}
                onChange={(event) =>
                  setExportRuleFilter(event.target.value)
                }
              >
                <option value="">
                  Tất cả
                </option>

                <option value="FIFO">
                  FIFO
                </option>

                <option value="FEFO">
                  FEFO
                </option>
              </select>
            </div>

            <div className="col-xl-3 col-lg-6">
              <label
                className="form-label"
                htmlFor="stock-out-sort"
              >
                Sắp xếp
              </label>

              <select
                id="stock-out-sort"
                className="form-select"
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
              >
                <option value="newest">
                  Phiếu mới nhất
                </option>

                <option value="oldest">
                  Phiếu cũ nhất
                </option>

                <option value="date_desc">
                  Ngày xuất mới nhất
                </option>

                <option value="date_asc">
                  Ngày xuất cũ nhất
                </option>

                <option value="amount_desc">
                  Phí lưu kho cao nhất
                </option>

                <option value="amount_asc">
                  Phí lưu kho thấp nhất
                </option>
              </select>
            </div>

            <div className="col-xl-3 col-lg-6">
              <label
                className="form-label"
                htmlFor="stock-out-date-from"
              >
                Từ ngày
              </label>

              <input
                id="stock-out-date-from"
                type="date"
                className="form-control"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(event) => setDateFrom(event.target.value)}
              />
            </div>

            <div className="col-xl-3 col-lg-6">
              <label
                className="form-label"
                htmlFor="stock-out-date-to"
              >
                Đến ngày
              </label>

              <input
                id="stock-out-date-to"
                type="date"
                className="form-control"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(event) => setDateTo(event.target.value)}
              />
            </div>

            <div className="col-xl-2 col-lg-6">
              <label
                className="form-label"
                htmlFor="stock-out-page-size"
              >
                Số dòng
              </label>

              <select
                id="stock-out-page-size"
                className="form-select"
                value={pageSize}
                onChange={(event) =>
                  setPageSize(Number(event.target.value))
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

            <div className="col-xl-2 col-lg-6">
              <button
                type="button"
                className="btn btn-outline-secondary w-100"
                onClick={handleResetFilters}
                disabled={loading}
              >
                <i className="bi bi-arrow-counterclockwise me-2" />
                Xóa lọc
              </button>
            </div>

            <div className="col-xl-2 col-lg-12">
              <div className="text-muted">
                Tìm thấy{" "}
                <strong className="text-dark">
                  {formatNumber(totalItems)}
                </strong>{" "}
                phiếu
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Danh sách phiếu xuất */}
      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Mã phiếu</th>
                  <th>Ngày xuất</th>
                  <th>Kho</th>
                  <th>Cổng xuất</th>
                  <th>Quy tắc</th>
                  <th>Người tạo</th>
                  <th>Số dòng xuất</th>
                  <th>Tổng container</th>
                  <th>Tổng phí lưu kho</th>
                  <th>Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan="11"
                      className="text-center text-muted py-5"
                    >
                      <div
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                      />

                      Đang tải dữ liệu...
                    </td>
                  </tr>
                ) : stockOuts.length === 0 ? (
                  <tr>
                    <td
                      colSpan="11"
                      className="text-center text-muted py-5"
                    >
                      <i className="bi bi-box-arrow-up fs-2 d-block mb-2" />
                      Không tìm thấy phiếu xuất phù hợp.
                    </td>
                  </tr>
                ) : (
                  stockOuts.map((stockOut, index) => (
                    <tr key={stockOut.id}>
                      <td>
                        {firstItemNumber + index}
                      </td>

                      <td>
                        <strong>
                          PX-{String(stockOut.id).padStart(4, "0")}
                        </strong>
                      </td>

                      <td>
                        {formatDate(stockOut.export_date)}
                      </td>

                      <td>
                        {stockOut.warehouse_name}
                      </td>

                      <td>
                        {stockOut.gate_name}
                      </td>

                      <td>
                        <span
                          className={`badge ${
                            stockOut.export_rule === "FEFO"
                              ? "bg-warning text-dark"
                              : "bg-primary"
                          }`}
                        >
                          {stockOut.export_rule}
                        </span>
                      </td>

                      <td>
                        {stockOut.created_by}
                      </td>

                      <td>
                        {formatNumber(stockOut.total_items)}
                      </td>

                      <td>
                        <strong>
                          {formatNumber(stockOut.total_containers)} container
                        </strong>
                      </td>

                      <td>
                        <strong className="text-primary">
                          {formatCurrency(stockOut.total_amount)}
                        </strong>
                      </td>

                      <td className="text-nowrap">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary"
                          onClick={() =>
                            navigate(`/stock-outs/${stockOut.id}`)
                          }
                        >
                          Xem
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Phân trang */}
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 border-top pt-3 mt-2">
            <div className="text-muted small">
              Hiển thị{" "}
              <strong>
                {formatNumber(firstItemNumber)}
              </strong>{" "}
              đến{" "}
              <strong>
                {formatNumber(lastItemNumber)}
              </strong>{" "}
              trên tổng{" "}
              <strong>
                {formatNumber(totalItems)}
              </strong>{" "}
              phiếu xuất
            </div>

            <nav aria-label="Phân trang phiếu xuất">
              <ul className="pagination pagination-sm mb-0">
                <li
                  className={`page-item ${
                    currentPage === 1 ? "disabled" : ""
                  }`}
                >
                  <button
                    type="button"
                    className="page-link"
                    disabled={currentPage === 1 || loading}
                    onClick={() =>
                      setCurrentPage((previousPage) =>
                        Math.max(1, previousPage - 1)
                      )
                    }
                  >
                    <i className="bi bi-chevron-left me-1" />
                    Trước
                  </button>
                </li>

                {visiblePages.map((page) => (
                  <li
                    key={page}
                    className={`page-item ${
                      currentPage === page ? "active" : ""
                    }`}
                  >
                    <button
                      type="button"
                      className="page-link"
                      disabled={loading}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  </li>
                ))}

                <li
                  className={`page-item ${
                    currentPage === totalPages ? "disabled" : ""
                  }`}
                >
                  <button
                    type="button"
                    className="page-link"
                    disabled={currentPage === totalPages || loading}
                    onClick={() =>
                      setCurrentPage((previousPage) =>
                        Math.min(totalPages, previousPage + 1)
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
            <strong>Ghi chú:</strong>{" "}
            Tổng phí lưu kho được tính từ chi tiết phiếu xuất: số container xuất × số ngày lưu kho × đơn giá lưu kho.
          </div>
        </div>
      </div>
    </div>
  );
}

export default StockOutListPage;
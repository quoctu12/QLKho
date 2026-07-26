import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getStockIns } from "../api/stockInApi";
import { getWarehouses } from "../api/warehouseApi";
import { getSuppliers } from "../api/supplierApi";

function StockInListPage() {
  const navigate = useNavigate();

  const [stockIns, setStockIns] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [error, setError] = useState("");

  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");

  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
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

  useEffect(() => {
    loadFilterData();
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedKeyword(keyword.trim());
    }, 400);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [keyword]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    debouncedKeyword,
    warehouseFilter,
    supplierFilter,
    dateFrom,
    dateTo,
    sortBy,
    pageSize,
  ]);

  useEffect(() => {
    loadStockIns();
  }, [
    currentPage,
    pageSize,
    debouncedKeyword,
    warehouseFilter,
    supplierFilter,
    dateFrom,
    dateTo,
    sortBy,
  ]);

  async function loadFilterData() {
    try {
      setLoadingFilters(true);

      const [warehouseData, supplierData] = await Promise.all([
        getWarehouses(),
        getSuppliers(),
      ]);

      setWarehouses(Array.isArray(warehouseData) ? warehouseData : []);
      setSuppliers(Array.isArray(supplierData) ? supplierData : []);
    } catch (err) {
      console.error("Lỗi tải dữ liệu bộ lọc:", err);
      setWarehouses([]);
      setSuppliers([]);
    } finally {
      setLoadingFilters(false);
    }
  }

  async function loadStockIns() {
    try {
      setLoading(true);
      setError("");

      const data = await getStockIns({
        page: currentPage,
        limit: pageSize,
        keyword: debouncedKeyword || undefined,
        warehouse_id: warehouseFilter || undefined,
        supplier_id: supplierFilter || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        sort_by: sortBy,
      });

      const stockInRows = Array.isArray(data?.stock_ins)
        ? data.stock_ins
        : [];

      const paginationData = data?.pagination || {};

      setStockIns(stockInRows);

      setPagination({
        page: Number(paginationData.page || currentPage),
        limit: Number(paginationData.limit || pageSize),
        total_items: Number(paginationData.total_items || 0),
        total_pages: Math.max(1, Number(paginationData.total_pages || 1)),
        has_previous_page: Boolean(paginationData.has_previous_page),
        has_next_page: Boolean(paginationData.has_next_page),
      });
    } catch (err) {
      console.error("Lỗi tải phiếu nhập:", err);

      setStockIns([]);

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
          "Không thể tải danh sách phiếu nhập."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleResetFilters() {
    setKeyword("");
    setDebouncedKeyword("");
    setWarehouseFilter("");
    setSupplierFilter("");
    setDateFrom("");
    setDateTo("");
    setSortBy("newest");
    setPageSize(10);
    setCurrentPage(1);
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
    totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;

  const lastItemNumber = Math.min(currentPage * pageSize, totalItems);

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
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4">
        <div>
          <h1 className="h4 mb-1">
            Quản lý nhập kho
          </h1>

          <p className="text-muted mb-0">
            Theo dõi phiếu nhập theo số lượng, container và vị trí lưu trữ.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => navigate("/stock-ins/create")}
        >
          <i className="bi bi-plus-lg me-2" />
          Tạo phiếu nhập
        </button>
      </div>

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-xl-4 col-lg-6">
              <label className="form-label" htmlFor="stock-in-keyword">
                Tìm kiếm
              </label>

              <div className="input-group">
                <span className="input-group-text bg-white">
                  <i className="bi bi-search" />
                </span>

                <input
                  id="stock-in-keyword"
                  type="search"
                  className="form-control"
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="Mã phiếu, nhà cung cấp, kho hoặc người tạo"
                />
              </div>
            </div>

            <div className="col-xl-3 col-lg-6">
              <label className="form-label" htmlFor="stock-in-warehouse-filter">
                Kho
              </label>

              <select
                id="stock-in-warehouse-filter"
                className="form-select"
                value={warehouseFilter}
                disabled={loadingFilters}
                onChange={(event) => setWarehouseFilter(event.target.value)}
              >
                <option value="">
                  {loadingFilters ? "Đang tải kho..." : "Tất cả kho"}
                </option>

                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-xl-3 col-lg-6">
              <label className="form-label" htmlFor="stock-in-supplier-filter">
                Nhà cung cấp
              </label>

              <select
                id="stock-in-supplier-filter"
                className="form-select"
                value={supplierFilter}
                disabled={loadingFilters}
                onChange={(event) => setSupplierFilter(event.target.value)}
              >
                <option value="">
                  {loadingFilters
                    ? "Đang tải nhà cung cấp..."
                    : "Tất cả nhà cung cấp"}
                </option>

                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-xl-2 col-lg-6">
              <label className="form-label" htmlFor="stock-in-sort">
                Sắp xếp
              </label>

              <select
                id="stock-in-sort"
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
                  Ngày nhập mới nhất
                </option>

                <option value="date_asc">
                  Ngày nhập cũ nhất
                </option>

                <option value="quantity_desc">
                  Số lượng cao nhất
                </option>

                <option value="quantity_asc">
                  Số lượng thấp nhất
                </option>

                <option value="container_desc">
                  Container cao nhất
                </option>

                <option value="container_asc">
                  Container thấp nhất
                </option>
              </select>
            </div>

            <div className="col-xl-3 col-lg-6">
              <label className="form-label" htmlFor="stock-in-date-from">
                Từ ngày
              </label>

              <input
                id="stock-in-date-from"
                type="date"
                className="form-control"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(event) => setDateFrom(event.target.value)}
              />
            </div>

            <div className="col-xl-3 col-lg-6">
              <label className="form-label" htmlFor="stock-in-date-to">
                Đến ngày
              </label>

              <input
                id="stock-in-date-to"
                type="date"
                className="form-control"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(event) => setDateTo(event.target.value)}
              />
            </div>

            <div className="col-xl-2 col-lg-6">
              <label className="form-label" htmlFor="stock-in-page-size">
                Số dòng
              </label>

              <select
                id="stock-in-page-size"
                className="form-select"
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
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

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Mã phiếu</th>
                  <th>Ngày nhập</th>
                  <th>Nhà cung cấp</th>
                  <th>Kho</th>
                  <th>Cổng nhập</th>
                  <th>Người tạo</th>
                  <th>Số mặt hàng</th>
                  <th>Tổng số lượng</th>
                  <th>Tổng container</th>
                  <th>Thao tác</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="11" className="text-center text-muted py-5">
                      <div className="spinner-border spinner-border-sm me-2" role="status" />
                      Đang tải dữ liệu...
                    </td>
                  </tr>
                ) : stockIns.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="text-center text-muted py-5">
                      <i className="bi bi-box-arrow-in-down fs-2 d-block mb-2" />
                      Không tìm thấy phiếu nhập phù hợp.
                    </td>
                  </tr>
                ) : (
                  stockIns.map((stockIn, index) => (
                    <tr key={stockIn.id}>
                      <td>
                        {firstItemNumber + index}
                      </td>

                      <td>
                        <strong>
                          PN-{String(stockIn.id).padStart(4, "0")}
                        </strong>
                      </td>

                      <td>
                        {formatDate(stockIn.import_date)}
                      </td>

                      <td>
                        {stockIn.supplier_name}
                      </td>

                      <td>
                        {stockIn.warehouse_name}
                      </td>

                      <td>
                        {stockIn.gate_name}
                      </td>

                      <td>
                        {stockIn.created_by}
                      </td>

                      <td>
                        {formatNumber(stockIn.total_items)}
                      </td>

                      <td>
                        <strong>
                          {formatNumber(stockIn.total_quantity)}
                        </strong>
                      </td>

                      <td>
                        <strong>
                          {formatNumber(stockIn.total_containers)} container
                        </strong>
                      </td>

                      <td className="text-nowrap">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => navigate(`/stock-ins/${stockIn.id}`)}
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
              phiếu nhập
            </div>

            <nav aria-label="Phân trang phiếu nhập">
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
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
                    className={`page-item ${currentPage === page ? "active" : ""}`}
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

                <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
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
            Phiếu nhập hiện chỉ ghi nhận số lượng hàng, số container và vị trí lưu trữ. Tiền lưu kho sẽ được tính khi xuất kho.
          </div>
        </div>
      </div>
    </div>
  );
}

export default StockInListPage;
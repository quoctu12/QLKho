import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { getWarehouses } from "../api/warehouseApi";

import {
  activateStoragePolicy,
  createStoragePolicy,
  deactivateStoragePolicy,
  deleteStoragePolicy,
  getStoragePolicies,
  updateStoragePolicy,
} from "../api/storagePolicyApi";

import { useAuth } from "../contexts/AuthContext";

function getTodayInputValue() {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    now.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function toInputDate(value) {
  if (!value) {
    return "";
  }

  const matchedDate = String(value).match(
    /^(\d{4})-(\d{2})-(\d{2})/
  );

  if (!matchedDate) {
    return "";
  }

  return `${matchedDate[1]}-${matchedDate[2]}-${matchedDate[3]}`;
}

function toBoolean(value) {
  return (
    value === true ||
    value === 1 ||
    value === "1"
  );
}

function getDefaultFormData() {
  return {
    warehouse_id: "",
    policy_code: "",
    policy_name: "",
    version_number: "1",

    max_storage_days: "30",
    warning_days: "5",

    apply_overdue_fee: true,
    overdue_multiplier: "1.5",

    allow_overdue_export: true,
    require_overdue_note: true,

    is_supplier_visible: true,

    effective_from:
      getTodayInputValue(),

    status: "draft",

    policy_content: "",
    note: "",
  };
}

function StoragePolicyListPage() {
  const { user } = useAuth();

  const currentRole = String(
    user?.role || ""
  ).toUpperCase();

  const canManageStoragePolicy = [
    "ADMIN",
    "MANAGER",
  ].includes(currentRole);

  const [policies, setPolicies] =
    useState([]);

  const [warehouses, setWarehouses] =
    useState([]);

  const [formData, setFormData] =
    useState(getDefaultFormData());

  const [
    editingPolicy,
    setEditingPolicy,
  ] = useState(null);

  const [filters, setFilters] =
    useState({
      keyword: "",
      warehouse_id: "",
      status: "",
      sort_by: "newest",
    });

  const [
    appliedFilters,
    setAppliedFilters,
  ] = useState({
    keyword: "",
    warehouse_id: "",
    status: "",
    sort_by: "newest",
  });

  const [pageSize, setPageSize] =
    useState(10);

  const [
    currentPage,
    setCurrentPage,
  ] = useState(1);

  const [pagination, setPagination] =
    useState({
      page: 1,
      limit: 10,
      total_items: 0,
      total_pages: 1,
      has_previous_page: false,
      has_next_page: false,
    });

  const [loading, setLoading] =
    useState(true);

  const [
    loadingWarehouses,
    setLoadingWarehouses,
  ] = useState(true);

  const [saving, setSaving] =
    useState(false);

  const [actionId, setActionId] =
    useState(null);

  const [error, setError] =
    useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  /*
  |--------------------------------------------------------------------------
  | Tải dữ liệu
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadWarehouses();
  }, []);

  useEffect(() => {
    loadPolicies();
  }, [
    currentPage,
    pageSize,
    appliedFilters.keyword,
    appliedFilters.warehouse_id,
    appliedFilters.status,
    appliedFilters.sort_by,
  ]);

  async function loadWarehouses() {
    try {
      setLoadingWarehouses(true);

      const data =
        await getWarehouses();

      setWarehouses(
        Array.isArray(data)
          ? data
          : []
      );
    } catch (err) {
      console.error(
        "Lỗi tải danh sách kho:",
        err
      );

      setWarehouses([]);
    } finally {
      setLoadingWarehouses(false);
    }
  }

  async function loadPolicies() {
    try {
      setLoading(true);
      setError("");

      const params = {
        page: currentPage,
        limit: pageSize,
        sort_by:
          appliedFilters.sort_by ||
          "newest",
      };

      if (
        appliedFilters.keyword
      ) {
        params.keyword =
          appliedFilters.keyword;
      }

      if (
        appliedFilters.warehouse_id
      ) {
        params.warehouse_id =
          appliedFilters.warehouse_id;
      }

      if (
        appliedFilters.status
      ) {
        params.status =
          appliedFilters.status;
      }

      const data =
        await getStoragePolicies(
          params
        );

      const policyRows =
        Array.isArray(data?.policies)
          ? data.policies
          : [];

      const paginationData =
        data?.pagination || {};

      const responsePage = Number(
        paginationData.page ||
          currentPage
      );

      setPolicies(policyRows);

      setPagination({
        page: responsePage,

        limit: Number(
          paginationData.limit ||
            pageSize
        ),

        total_items: Number(
          paginationData.total_items ||
            0
        ),

        total_pages: Math.max(
          1,
          Number(
            paginationData.total_pages ||
              1
          )
        ),

        has_previous_page: Boolean(
          paginationData
            .has_previous_page
        ),

        has_next_page: Boolean(
          paginationData
            .has_next_page
        ),
      });

      if (
        responsePage !==
        currentPage
      ) {
        setCurrentPage(
          responsePage
        );
      }
    } catch (err) {
      console.error(
        "Lỗi tải chính sách lưu kho:",
        err
      );

      setPolicies([]);

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
          "Không thể tải danh sách chính sách lưu kho."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Form
  |--------------------------------------------------------------------------
  */

  function handleFormChange(event) {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    const nextValue =
      type === "checkbox"
        ? checked
        : value;

    setFormData((previous) => {
      const nextData = {
        ...previous,
        [name]: nextValue,
      };

      if (
        name ===
          "apply_overdue_fee" &&
        checked === false
      ) {
        nextData.overdue_multiplier =
          "1";
      }

      if (
        name ===
          "allow_overdue_export" &&
        checked === false
      ) {
        nextData.require_overdue_note =
          false;
      }

      return nextData;
    });
  }

  function resetForm() {
    setEditingPolicy(null);

    setFormData(
      getDefaultFormData()
    );

    setError("");
  }

  function setFormFromPolicy(
    policy,
    createNewVersion = false
  ) {
    setEditingPolicy(
      createNewVersion
        ? null
        : policy
    );

    setFormData({
      warehouse_id: String(
        policy.warehouse_id || ""
      ),

      policy_code:
        policy.policy_code || "",

      policy_name:
        policy.policy_name || "",

      version_number: String(
        createNewVersion
          ? Number(
              policy.version_number ||
                1
            ) + 1
          : Number(
              policy.version_number ||
                1
            )
      ),

      max_storage_days: String(
        policy.max_storage_days ||
          ""
      ),

      warning_days: String(
        policy.warning_days ?? ""
      ),

      apply_overdue_fee:
        toBoolean(
          policy.apply_overdue_fee
        ),

      overdue_multiplier:
        String(
          policy.overdue_multiplier ||
            1
        ),

      allow_overdue_export:
        toBoolean(
          policy.allow_overdue_export
        ),

      require_overdue_note:
        toBoolean(
          policy.require_overdue_note
        ),

      is_supplier_visible:
        toBoolean(
          policy.is_supplier_visible
        ),

      effective_from:
        createNewVersion
          ? getTodayInputValue()
          : toInputDate(
              policy.effective_from
            ),

      status: createNewVersion
        ? "draft"
        : policy.status ||
          "draft",

      policy_content:
        policy.policy_content || "",

      note: policy.note || "",
    });

    setError("");
    setSuccessMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function handleEdit(policy) {
    if (!canManageStoragePolicy) {
      setError(
        "Bạn không có quyền sửa chính sách."
      );

      return;
    }

    setFormFromPolicy(
      policy,
      false
    );
  }

  function handleCreateVersion(policy) {
    if (!canManageStoragePolicy) {
      setError(
        "Bạn không có quyền tạo phiên bản chính sách."
      );

      return;
    }

    setFormFromPolicy(
      policy,
      true
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccessMessage("");

    if (!canManageStoragePolicy) {
      setError(
        "Bạn không có quyền lưu chính sách."
      );

      return;
    }

    const warehouseId = Number(
      formData.warehouse_id
    );

    const versionNumber = Number(
      formData.version_number
    );

    const maxStorageDays = Number(
      formData.max_storage_days
    );

    const warningDays = Number(
      formData.warning_days
    );

    const overdueMultiplier =
      Number(
        formData.overdue_multiplier
      );

    if (
      !Number.isInteger(warehouseId) ||
      warehouseId <= 0
    ) {
      setError(
        "Vui lòng chọn kho áp dụng."
      );

      return;
    }

    if (
      !formData.policy_code.trim()
    ) {
      setError(
        "Vui lòng nhập mã chính sách."
      );

      return;
    }

    if (
      !formData.policy_name.trim()
    ) {
      setError(
        "Vui lòng nhập tên chính sách."
      );

      return;
    }

    if (
      !Number.isInteger(
        versionNumber
      ) ||
      versionNumber <= 0
    ) {
      setError(
        "Phiên bản phải là số nguyên lớn hơn 0."
      );

      return;
    }

    if (
      !Number.isInteger(
        maxStorageDays
      ) ||
      maxStorageDays <= 0
    ) {
      setError(
        "Thời hạn lưu tối đa phải là số nguyên lớn hơn 0."
      );

      return;
    }

    if (
      !Number.isInteger(
        warningDays
      ) ||
      warningDays < 0 ||
      warningDays >=
        maxStorageDays
    ) {
      setError(
        "Số ngày cảnh báo phải từ 0 đến nhỏ hơn thời hạn lưu tối đa."
      );

      return;
    }

    if (
      !Number.isFinite(
        overdueMultiplier
      ) ||
      overdueMultiplier < 1
    ) {
      setError(
        "Hệ số phí quá hạn phải lớn hơn hoặc bằng 1."
      );

      return;
    }

    if (
      !formData.effective_from
    ) {
      setError(
        "Vui lòng chọn ngày bắt đầu áp dụng."
      );

      return;
    }

    const payload = {
      warehouse_id: warehouseId,

      policy_code:
        formData.policy_code.trim(),

      policy_name:
        formData.policy_name.trim(),

      version_number:
        versionNumber,

      max_storage_days:
        maxStorageDays,

      warning_days:
        warningDays,

      apply_overdue_fee:
        formData.apply_overdue_fee,

      overdue_multiplier:
        formData.apply_overdue_fee
          ? overdueMultiplier
          : 1,

      allow_overdue_export:
        formData.allow_overdue_export,

      require_overdue_note:
        formData
          .allow_overdue_export
          ? formData
              .require_overdue_note
          : false,

      is_supplier_visible:
        formData.is_supplier_visible,

      effective_from:
        formData.effective_from,

      status: formData.status,

      policy_content:
        formData.policy_content.trim(),

      note: formData.note.trim(),
    };

    try {
      setSaving(true);

      let result;

      if (editingPolicy) {
        result =
          await updateStoragePolicy(
            editingPolicy.id,
            payload
          );
      } else {
        result =
          await createStoragePolicy(
            payload
          );
      }

      setSuccessMessage(
        result?.message ||
          (editingPolicy
            ? "Cập nhật chính sách thành công."
            : "Tạo chính sách thành công.")
      );

      resetForm();

      await loadPolicies();
    } catch (err) {
      console.error(
        "Lỗi lưu chính sách:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Không thể lưu chính sách lưu kho."
      );
    } finally {
      setSaving(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Bộ lọc
  |--------------------------------------------------------------------------
  */

  function handleFilterChange(event) {
    const { name, value } =
      event.target;

    setFilters((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handleSearch(event) {
    event.preventDefault();

    setCurrentPage(1);

    setAppliedFilters({
      keyword:
        filters.keyword.trim(),

      warehouse_id:
        filters.warehouse_id,

      status: filters.status,

      sort_by: filters.sort_by,
    });
  }

  function handleResetFilters() {
    const defaultFilters = {
      keyword: "",
      warehouse_id: "",
      status: "",
      sort_by: "newest",
    };

    setFilters(defaultFilters);
    setAppliedFilters(
      defaultFilters
    );

    setPageSize(10);
    setCurrentPage(1);
  }

  /*
  |--------------------------------------------------------------------------
  | Thao tác chính sách
  |--------------------------------------------------------------------------
  */

  async function handleActivate(policy) {
    if (!canManageStoragePolicy) {
      setError(
        "Bạn không có quyền kích hoạt chính sách."
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Kích hoạt chính sách "${policy.policy_name}" phiên bản ${policy.version_number}?\n\nChính sách đang hoạt động khác của kho sẽ chuyển sang ngừng áp dụng.`
      );

    if (!confirmed) {
      return;
    }

    try {
      setActionId(policy.id);
      setError("");
      setSuccessMessage("");

      const result =
        await activateStoragePolicy(
          policy.id
        );

      setSuccessMessage(
        result?.message ||
          "Kích hoạt chính sách thành công."
      );

      await loadPolicies();
    } catch (err) {
      console.error(
        "Lỗi kích hoạt chính sách:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Không thể kích hoạt chính sách."
      );
    } finally {
      setActionId(null);
    }
  }

  async function handleDeactivate(policy) {
    if (!canManageStoragePolicy) {
      setError(
        "Bạn không có quyền ngừng chính sách."
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Ngừng áp dụng chính sách "${policy.policy_name}"?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setActionId(policy.id);
      setError("");
      setSuccessMessage("");

      const result =
        await deactivateStoragePolicy(
          policy.id
        );

      setSuccessMessage(
        result?.message ||
          "Đã ngừng áp dụng chính sách."
      );

      await loadPolicies();
    } catch (err) {
      console.error(
        "Lỗi ngừng chính sách:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Không thể ngừng áp dụng chính sách."
      );
    } finally {
      setActionId(null);
    }
  }

  async function handleDelete(policy) {
    if (!canManageStoragePolicy) {
      setError(
        "Bạn không có quyền xóa chính sách."
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Xóa chính sách nháp "${policy.policy_name}"?\n\nThao tác này không thể hoàn tác.`
      );

    if (!confirmed) {
      return;
    }

    try {
      setActionId(policy.id);
      setError("");
      setSuccessMessage("");

      const result =
        await deleteStoragePolicy(
          policy.id
        );

      setSuccessMessage(
        result?.message ||
          "Đã xóa chính sách."
      );

      if (
        editingPolicy?.id ===
        policy.id
      ) {
        resetForm();
      }

      await loadPolicies();
    } catch (err) {
      console.error(
        "Lỗi xóa chính sách:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Không thể xóa chính sách."
      );
    } finally {
      setActionId(null);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Định dạng
  |--------------------------------------------------------------------------
  */

  function formatNumber(value) {
    return Number(
      value || 0
    ).toLocaleString("vi-VN");
  }

  function formatDate(value) {
    const inputDate =
      toInputDate(value);

    if (!inputDate) {
      return "Không có";
    }

    const [year, month, day] =
      inputDate.split("-");

    return `${day}/${month}/${year}`;
  }

  function formatMultiplier(value) {
    return `${Number(
      value || 1
    ).toLocaleString("vi-VN", {
      maximumFractionDigits: 2,
    })} lần`;
  }

  function getStatusBadge(status) {
    if (status === "active") {
      return (
        <span className="badge bg-success">
          Đang áp dụng
        </span>
      );
    }

    if (status === "inactive") {
      return (
        <span className="badge bg-secondary">
          Ngừng áp dụng
        </span>
      );
    }

    return (
      <span className="badge bg-warning text-dark">
        Bản nháp
      </span>
    );
  }

  const isProtectedPolicy =
    Boolean(
      editingPolicy &&
        Number(
          editingPolicy
            .total_batches_using_policy ||
            0
        ) > 0
    );

  const currentPageSummary =
    useMemo(() => {
      return policies.reduce(
        (result, policy) => ({
          active:
            result.active +
            (policy.status ===
            "active"
              ? 1
              : 0),

          draft:
            result.draft +
            (policy.status ===
            "draft"
              ? 1
              : 0),

          inactive:
            result.inactive +
            (policy.status ===
            "inactive"
              ? 1
              : 0),

          usedBatches:
            result.usedBatches +
            Number(
              policy
                .total_batches_using_policy ||
                0
            ),
        }),
        {
          active: 0,
          draft: 0,
          inactive: 0,
          usedBatches: 0,
        }
      );
    }, [policies]);

  const totalItems =
    pagination.total_items;

  const totalPages =
    pagination.total_pages;

  const firstItemNumber =
    totalItems === 0
      ? 0
      : (currentPage - 1) *
          pageSize +
        1;

  const lastItemNumber =
    Math.min(
      currentPage * pageSize,
      totalItems
    );

  const visiblePages =
    useMemo(() => {
      const maximumVisiblePages =
        5;

      let startPage = Math.max(
        1,
        currentPage -
          Math.floor(
            maximumVisiblePages /
              2
          )
      );

      let endPage = Math.min(
        totalPages,
        startPage +
          maximumVisiblePages -
          1
      );

      startPage = Math.max(
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
    }, [currentPage, totalPages]);

  const tableColumnCount =
    canManageStoragePolicy
      ? 10
      : 9;

  return (
    <div>
      <div className="mb-4">
        <h1 className="h4 mb-1">
          Chính sách lưu kho
        </h1>

        <p className="text-muted mb-0">
          Thiết lập thời hạn lưu, cảnh báo,
          hệ số phí và quy định xuất hàng
          quá hạn.
        </p>
      </div>

      {currentRole === "STAFF" && (
        <div className="alert alert-info">
          Bạn chỉ được xem chính sách lưu
          kho, không được tạo, sửa, kích
          hoạt, ngừng hoặc xóa chính sách.
        </div>
      )}

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success">
          {successMessage}
        </div>
      )}

      {/* Form quản lý chính sách */}
      {canManageStoragePolicy && (
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
              <div>
                <h5 className="card-title mb-1">
                  {editingPolicy
                    ? "Cập nhật chính sách"
                    : "Tạo chính sách mới"}
                </h5>

                {isProtectedPolicy && (
                  <div className="text-warning-emphasis small">
                    Chính sách đã được lô
                    hàng sử dụng. Các điều
                    khoản nghiệp vụ đã được
                    khóa.
                  </div>
                )}
              </div>

              {editingPolicy && (
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={resetForm}
                  disabled={saving}
                >
                  Hủy chỉnh sửa
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                <div className="col-lg-4 col-md-6">
                  <label className="form-label">
                    Kho áp dụng
                  </label>

                  <select
                    name="warehouse_id"
                    className="form-select"
                    value={
                      formData.warehouse_id
                    }
                    onChange={
                      handleFormChange
                    }
                    disabled={
                      saving ||
                      loadingWarehouses ||
                      isProtectedPolicy
                    }
                  >
                    <option value="">
                      {loadingWarehouses
                        ? "Đang tải kho..."
                        : "Chọn kho"}
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

                <div className="col-lg-4 col-md-6">
                  <label className="form-label">
                    Mã chính sách
                  </label>

                  <input
                    type="text"
                    name="policy_code"
                    className="form-control"
                    value={
                      formData.policy_code
                    }
                    onChange={
                      handleFormChange
                    }
                    placeholder="Ví dụ: CS-LK-01"
                    maxLength={50}
                    disabled={
                      saving ||
                      isProtectedPolicy
                    }
                  />
                </div>

                <div className="col-lg-4 col-md-6">
                  <label className="form-label">
                    Phiên bản
                  </label>

                  <input
                    type="number"
                    min="1"
                    step="1"
                    name="version_number"
                    className="form-control"
                    value={
                      formData.version_number
                    }
                    onChange={
                      handleFormChange
                    }
                    disabled={
                      saving ||
                      isProtectedPolicy
                    }
                  />
                </div>

                <div className="col-lg-8 col-md-6">
                  <label className="form-label">
                    Tên chính sách
                  </label>

                  <input
                    type="text"
                    name="policy_name"
                    className="form-control"
                    value={
                      formData.policy_name
                    }
                    onChange={
                      handleFormChange
                    }
                    placeholder="Nhập tên chính sách"
                    maxLength={150}
                    disabled={saving}
                  />
                </div>

                <div className="col-lg-4 col-md-6">
                  <label className="form-label">
                    Ngày bắt đầu áp dụng
                  </label>

                  <input
                    type="date"
                    name="effective_from"
                    className="form-control"
                    value={
                      formData.effective_from
                    }
                    onChange={
                      handleFormChange
                    }
                    disabled={
                      saving ||
                      isProtectedPolicy
                    }
                  />
                </div>

                <div className="col-lg-3 col-md-6">
                  <label className="form-label">
                    Thời hạn lưu tối đa
                  </label>

                  <div className="input-group">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      name="max_storage_days"
                      className="form-control"
                      value={
                        formData.max_storage_days
                      }
                      onChange={
                        handleFormChange
                      }
                      disabled={
                        saving ||
                        isProtectedPolicy
                      }
                    />

                    <span className="input-group-text">
                      ngày
                    </span>
                  </div>
                </div>

                <div className="col-lg-3 col-md-6">
                  <label className="form-label">
                    Cảnh báo trước
                  </label>

                  <div className="input-group">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      name="warning_days"
                      className="form-control"
                      value={
                        formData.warning_days
                      }
                      onChange={
                        handleFormChange
                      }
                      disabled={
                        saving ||
                        isProtectedPolicy
                      }
                    />

                    <span className="input-group-text">
                      ngày
                    </span>
                  </div>
                </div>

                <div className="col-lg-3 col-md-6">
                  <label className="form-label">
                    Hệ số phí quá hạn
                  </label>

                  <div className="input-group">
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      name="overdue_multiplier"
                      className="form-control"
                      value={
                        formData.overdue_multiplier
                      }
                      onChange={
                        handleFormChange
                      }
                      disabled={
                        saving ||
                        isProtectedPolicy ||
                        !formData
                          .apply_overdue_fee
                      }
                    />

                    <span className="input-group-text">
                      lần
                    </span>
                  </div>
                </div>

                <div className="col-lg-3 col-md-6">
                  <label className="form-label">
                    Trạng thái
                  </label>

                  <select
                    name="status"
                    className="form-select"
                    value={
                      formData.status
                    }
                    onChange={
                      handleFormChange
                    }
                    disabled={saving}
                  >
                    <option value="draft">
                      Bản nháp
                    </option>

                    <option value="active">
                      Đang áp dụng
                    </option>

                    <option value="inactive">
                      Ngừng áp dụng
                    </option>
                  </select>
                </div>

                <div className="col-lg-4">
                  <div className="form-check form-switch">
                    <input
                      id="apply-overdue-fee"
                      type="checkbox"
                      name="apply_overdue_fee"
                      className="form-check-input"
                      checked={
                        formData.apply_overdue_fee
                      }
                      onChange={
                        handleFormChange
                      }
                      disabled={
                        saving ||
                        isProtectedPolicy
                      }
                    />

                    <label
                      className="form-check-label"
                      htmlFor="apply-overdue-fee"
                    >
                      Áp dụng hệ số phí quá hạn
                    </label>
                  </div>
                </div>

                <div className="col-lg-4">
                  <div className="form-check form-switch">
                    <input
                      id="allow-overdue-export"
                      type="checkbox"
                      name="allow_overdue_export"
                      className="form-check-input"
                      checked={
                        formData.allow_overdue_export
                      }
                      onChange={
                        handleFormChange
                      }
                      disabled={
                        saving ||
                        isProtectedPolicy
                      }
                    />

                    <label
                      className="form-check-label"
                      htmlFor="allow-overdue-export"
                    >
                      Cho phép xuất hàng quá hạn
                    </label>
                  </div>
                </div>

                <div className="col-lg-4">
                  <div className="form-check form-switch">
                    <input
                      id="require-overdue-note"
                      type="checkbox"
                      name="require_overdue_note"
                      className="form-check-input"
                      checked={
                        formData.require_overdue_note
                      }
                      onChange={
                        handleFormChange
                      }
                      disabled={
                        saving ||
                        isProtectedPolicy ||
                        !formData
                          .allow_overdue_export
                      }
                    />

                    <label
                      className="form-check-label"
                      htmlFor="require-overdue-note"
                    >
                      Bắt buộc ghi chú khi xuất
                      quá hạn
                    </label>
                  </div>
                </div>

                <div className="col-lg-4">
                  <div className="form-check form-switch">
                    <input
                      id="supplier-visible"
                      type="checkbox"
                      name="is_supplier_visible"
                      className="form-check-input"
                      checked={
                        formData.is_supplier_visible
                      }
                      onChange={
                        handleFormChange
                      }
                      disabled={saving}
                    />

                    <label
                      className="form-check-label"
                      htmlFor="supplier-visible"
                    >
                      Cho nhà cung cấp xem chính
                      sách
                    </label>
                  </div>
                </div>

                <div className="col-12">
                  <label className="form-label">
                    Nội dung chính sách
                  </label>

                  <textarea
                    name="policy_content"
                    className="form-control"
                    rows="5"
                    value={
                      formData.policy_content
                    }
                    onChange={
                      handleFormChange
                    }
                    placeholder="Mô tả điều khoản lưu kho, trách nhiệm các bên và cách xử lý hàng quá hạn..."
                    maxLength={10000}
                    disabled={saving}
                  />
                </div>

                <div className="col-12">
                  <label className="form-label">
                    Ghi chú nội bộ
                  </label>

                  <textarea
                    name="note"
                    className="form-control"
                    rows="2"
                    value={formData.note}
                    onChange={
                      handleFormChange
                    }
                    placeholder="Ghi chú dành cho nhân viên kho"
                    maxLength={1000}
                    disabled={saving}
                  />
                </div>

                <div className="col-12">
                  <div className="d-flex justify-content-end gap-2">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={resetForm}
                      disabled={saving}
                    >
                      Làm mới
                    </button>

                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={saving}
                    >
                      {saving
                        ? "Đang lưu..."
                        : editingPolicy
                          ? "Cập nhật chính sách"
                          : "Tạo chính sách"}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bộ lọc */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <form onSubmit={handleSearch}>
            <div className="row g-3 align-items-end">
              <div className="col-lg-3 col-md-6">
                <label className="form-label">
                  Tìm kiếm
                </label>

                <input
                  type="search"
                  name="keyword"
                  className="form-control"
                  value={filters.keyword}
                  onChange={
                    handleFilterChange
                  }
                  placeholder="Mã, tên chính sách hoặc kho"
                />
              </div>

              <div className="col-lg-2 col-md-6">
                <label className="form-label">
                  Kho
                </label>

                <select
                  name="warehouse_id"
                  className="form-select"
                  value={
                    filters.warehouse_id
                  }
                  onChange={
                    handleFilterChange
                  }
                  disabled={
                    loadingWarehouses
                  }
                >
                  <option value="">
                    Tất cả kho
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

              <div className="col-lg-2 col-md-6">
                <label className="form-label">
                  Trạng thái
                </label>

                <select
                  name="status"
                  className="form-select"
                  value={filters.status}
                  onChange={
                    handleFilterChange
                  }
                >
                  <option value="">
                    Tất cả
                  </option>

                  <option value="active">
                    Đang áp dụng
                  </option>

                  <option value="draft">
                    Bản nháp
                  </option>

                  <option value="inactive">
                    Ngừng áp dụng
                  </option>
                </select>
              </div>

              <div className="col-lg-2 col-md-6">
                <label className="form-label">
                  Sắp xếp
                </label>

                <select
                  name="sort_by"
                  className="form-select"
                  value={filters.sort_by}
                  onChange={
                    handleFilterChange
                  }
                >
                  <option value="newest">
                    Mới nhất
                  </option>

                  <option value="oldest">
                    Cũ nhất
                  </option>

                  <option value="effective_desc">
                    Ngày áp dụng mới nhất
                  </option>

                  <option value="effective_asc">
                    Ngày áp dụng cũ nhất
                  </option>

                  <option value="version_desc">
                    Phiên bản cao nhất
                  </option>

                  <option value="name_asc">
                    Tên A-Z
                  </option>
                </select>
              </div>

              <div className="col-lg-2 col-md-6">
                <label className="form-label">
                  Số dòng
                </label>

                <select
                  className="form-select"
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(
                      Number(
                        event.target.value
                      )
                    );

                    setCurrentPage(1);
                  }}
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

              <div className="col-lg-3 col-md-6">
                <div className="d-flex gap-2">
                  <button
                    type="submit"
                    className="btn btn-primary flex-grow-1"
                    disabled={loading}
                  >
                    <i className="bi bi-funnel me-2" />
                    Lọc
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={
                      handleResetFilters
                    }
                    disabled={loading}
                  >
                    <i className="bi bi-arrow-counterclockwise" />
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Tổng quan */}
      <div className="row g-3 mb-4">
        <div className="col-lg-3 col-md-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted small">
                Đang áp dụng
              </div>

              <div className="fs-4 fw-bold text-success">
                {formatNumber(
                  currentPageSummary.active
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-3 col-md-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted small">
                Bản nháp
              </div>

              <div className="fs-4 fw-bold text-warning">
                {formatNumber(
                  currentPageSummary.draft
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-3 col-md-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted small">
                Ngừng áp dụng
              </div>

              <div className="fs-4 fw-bold text-secondary">
                {formatNumber(
                  currentPageSummary.inactive
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-3 col-md-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="text-muted small">
                Lô đang sử dụng
              </div>

              <div className="fs-4 fw-bold text-primary">
                {formatNumber(
                  currentPageSummary.usedBatches
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Danh sách */}
      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <h5 className="card-title mb-3">
            Danh sách chính sách
          </h5>

          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Chính sách</th>
                  <th>Kho</th>
                  <th>Thời hạn</th>
                  <th>Phí quá hạn</th>
                  <th>Quy định xuất</th>
                  <th>Ngày áp dụng</th>
                  <th>Lô sử dụng</th>
                  <th>Trạng thái</th>

                  {canManageStoragePolicy && (
                    <th>Thao tác</th>
                  )}
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={
                        tableColumnCount
                      }
                      className="text-center text-muted py-5"
                    >
                      <span className="spinner-border spinner-border-sm me-2" />
                      Đang tải chính sách...
                    </td>
                  </tr>
                ) : policies.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan={
                        tableColumnCount
                      }
                      className="text-center text-muted py-5"
                    >
                      Chưa có chính sách phù
                      hợp.
                    </td>
                  </tr>
                ) : (
                  policies.map(
                    (policy, index) => (
                      <tr
                        key={policy.id}
                        className={
                          policy.status ===
                          "active"
                            ? "table-success"
                            : ""
                        }
                      >
                        <td>
                          {firstItemNumber +
                            index}
                        </td>

                        <td
                          style={{
                            minWidth: "230px",
                          }}
                        >
                          <strong>
                            {
                              policy.policy_name
                            }
                          </strong>

                          <div className="small text-muted">
                            Mã:{" "}
                            {
                              policy.policy_code
                            }
                          </div>

                          <div className="small text-muted">
                            Phiên bản:{" "}
                            {
                              policy.version_number
                            }
                          </div>

                          {toBoolean(
                            policy.is_supplier_visible
                          ) ? (
                            <span className="badge bg-info text-dark mt-1">
                              Nhà cung cấp được
                              xem
                            </span>
                          ) : (
                            <span className="badge bg-dark mt-1">
                              Chỉ nội bộ
                            </span>
                          )}
                        </td>

                        <td>
                          {policy.warehouse_name ||
                            "Không có"}
                        </td>

                        <td className="text-nowrap">
                          <div>
                            Tối đa:{" "}
                            <strong>
                              {formatNumber(
                                policy.max_storage_days
                              )}{" "}
                              ngày
                            </strong>
                          </div>

                          <div className="small text-warning-emphasis">
                            Cảnh báo trước{" "}
                            {formatNumber(
                              policy.warning_days
                            )}{" "}
                            ngày
                          </div>
                        </td>

                        <td className="text-nowrap">
                          {toBoolean(
                            policy.apply_overdue_fee
                          ) ? (
                            <>
                              <span className="badge bg-danger">
                                Có áp dụng
                              </span>

                              <div className="small mt-1">
                                Hệ số:{" "}
                                <strong>
                                  {formatMultiplier(
                                    policy.overdue_multiplier
                                  )}
                                </strong>
                              </div>
                            </>
                          ) : (
                            <span className="badge bg-secondary">
                              Không tăng phí
                            </span>
                          )}
                        </td>

                        <td
                          style={{
                            minWidth: "190px",
                          }}
                        >
                          {toBoolean(
                            policy.allow_overdue_export
                          ) ? (
                            <>
                              <span className="badge bg-success">
                                Được xuất quá hạn
                              </span>

                              <div className="small mt-1">
                                {toBoolean(
                                  policy.require_overdue_note
                                )
                                  ? "Bắt buộc ghi chú"
                                  : "Không bắt buộc ghi chú"}
                              </div>
                            </>
                          ) : (
                            <span className="badge bg-danger">
                              Chặn xuất quá hạn
                            </span>
                          )}
                        </td>

                        <td className="text-nowrap">
                          {formatDate(
                            policy.effective_from
                          )}
                        </td>

                        <td className="text-center">
                          <strong>
                            {formatNumber(
                              policy
                                .total_batches_using_policy
                            )}
                          </strong>{" "}
                          lô
                        </td>

                        <td>
                          {getStatusBadge(
                            policy.status
                          )}
                        </td>

                        {canManageStoragePolicy && (
                          <td
                            className="text-nowrap"
                            style={{
                              minWidth:
                                "260px",
                            }}
                          >
                            <div className="d-flex flex-wrap gap-1">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary"
                                onClick={() =>
                                  handleEdit(
                                    policy
                                  )
                                }
                                disabled={
                                  actionId ===
                                  policy.id
                                }
                              >
                                Sửa
                              </button>

                              <button
                                type="button"
                                className="btn btn-sm btn-outline-info"
                                onClick={() =>
                                  handleCreateVersion(
                                    policy
                                  )
                                }
                                disabled={
                                  actionId ===
                                  policy.id
                                }
                              >
                                Phiên bản mới
                              </button>

                              {policy.status !==
                                "active" && (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-success"
                                  onClick={() =>
                                    handleActivate(
                                      policy
                                    )
                                  }
                                  disabled={
                                    actionId ===
                                    policy.id
                                  }
                                >
                                  Kích hoạt
                                </button>
                              )}

                              {policy.status ===
                                "active" && (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-secondary"
                                  onClick={() =>
                                    handleDeactivate(
                                      policy
                                    )
                                  }
                                  disabled={
                                    actionId ===
                                    policy.id
                                  }
                                >
                                  Ngừng
                                </button>
                              )}

                              {policy.status ===
                                "draft" && (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() =>
                                    handleDelete(
                                      policy
                                    )
                                  }
                                  disabled={
                                    actionId ===
                                    policy.id
                                  }
                                >
                                  Xóa
                                </button>
                              )}
                            </div>

                            {actionId ===
                              policy.id && (
                              <div className="small text-muted mt-2">
                                <span className="spinner-border spinner-border-sm me-1" />
                                Đang xử lý...
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>

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
              chính sách
            </div>

            <nav aria-label="Phân trang chính sách">
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
                      currentPage === 1 ||
                      loading
                    }
                    onClick={() =>
                      setCurrentPage(
                        (previous) =>
                          Math.max(
                            1,
                            previous - 1
                          )
                      )
                    }
                  >
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
                        (previous) =>
                          Math.min(
                            totalPages,
                            previous + 1
                          )
                      )
                    }
                  >
                    Sau
                  </button>
                </li>
              </ul>
            </nav>
          </div>

          <div className="alert alert-info mb-0 mt-3">
            <strong>
              Quy tắc phiên bản:
            </strong>{" "}
            Chính sách đã được lô hàng sử
            dụng không được thay đổi thời
            hạn, hệ số và điều kiện xuất quá
            hạn. Khi thay đổi nghiệp vụ, sử
            dụng nút “Phiên bản mới”.
          </div>
        </div>
      </div>
    </div>
  );
}

export default StoragePolicyListPage;
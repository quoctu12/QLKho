import { useEffect, useState } from "react";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../api/categoryApi";

function CategoryListPage() {
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  async function handleDelete(category) {
    const confirmed = window.confirm(
        `Bạn có chắc muốn xóa danh mục "${category.name}" không?`
    );

    if (!confirmed) {
        return;
    }

    try {
        const result = await deleteCategory(category.id);

        alert(result.message);
        await loadCategories();

        if (editingId === category.id) {
        handleCancelEdit();
        }
    } catch (err) {
        console.error("Lỗi xóa danh mục:", err);

        alert(
        err.response?.data?.message ||
            "Không thể xóa danh mục."
        );
    }
  }

  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      setLoading(true);
      const data = await getCategories();
      setCategories(data);
    } catch (err) {
      console.error(err);
      setError("Không thể tải danh sách danh mục.");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }
  function handleEdit(category) {
    setEditingId(category.id);

    setFormData({
        name: category.name || "",
        description: category.description || "",
    });
    }

    function handleCancelEdit() {
    setEditingId(null);

    setFormData({
        name: "",
        description: "",
    });

    setError("");
    }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!formData.name.trim()) {
        setError("Vui lòng nhập tên danh mục.");
        return;
    }

    try {
        setSaving(true);

        if (editingId) {
        await updateCategory(editingId, {
            name: formData.name.trim(),
            description: formData.description.trim(),
        });

        alert("Cập nhật danh mục thành công.");
        } else {
        await createCategory({
            name: formData.name.trim(),
            description: formData.description.trim(),
        });

        alert("Thêm danh mục thành công.");
        }

        setEditingId(null);

        setFormData({
        name: "",
        description: "",
        });

        await loadCategories();
    } catch (err) {
        console.error(err);

        setError(
        err.response?.data?.message ||
            "Không thể lưu danh mục."
        );
    } finally {
        setSaving(false);
    }
    }

  return (
    <div>
      <div className="mb-4">
        <h1 className="h4 mb-1">Quản lý danh mục</h1>
        <p className="text-muted mb-0">
          Thêm và xem các danh mục sản phẩm trong hệ thống.
        </p>
      </div>

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      <div className="row g-4">
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h5 className="card-title mb-3">
                {editingId ? "Sửa danh mục" : "Thêm danh mục"}
              </h5>

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">
                    Tên danh mục
                  </label>

                  <input
                    type="text"
                    name="name"
                    className="form-control"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Ví dụ: Đồ uống"
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">
                    Mô tả
                  </label>

                  <textarea
                    name="description"
                    className="form-control"
                    rows="4"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Nhập mô tả danh mục"
                  />
                </div>

                <div className="d-flex gap-2">
                <button
                    type="submit"
                    className="btn btn-primary flex-grow-1"
                    disabled={saving}
                >
                    {saving
                    ? "Đang lưu..."
                    : editingId
                    ? "Cập nhật danh mục"
                    : "Thêm danh mục"}
                </button>

                {editingId && (
                    <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCancelEdit}
                    >
                    Hủy
                    </button>
                )}
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h5 className="card-title mb-3">
                Danh sách danh mục
              </h5>

              {loading ? (
                <p>Đang tải dữ liệu...</p>
              ) : (
                <div className="table-responsive">
                  <table className="table align-middle">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Tên danh mục</th>
                        <th>Mô tả</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>

                    <tbody>
                      {categories.length === 0 ? (
                        <tr>
                          <td
                            colSpan="4"
                            className="text-center text-muted"
                          >
                            Chưa có danh mục.
                          </td>
                        </tr>
                      ) : (
                        categories.map((category) => (
                          <tr key={category.id}>
                            <td>{category.id}</td>
                            <td>{category.name}</td>
                            <td>
                                {category.description || "Không có mô tả"}
                            </td>
                            <td>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline-warning me-2"
                                    onClick={() => handleEdit(category)}
                                >
                                    Sửa
                                </button>

                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => handleDelete(category)}
                                >
                                    Xóa
                                </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CategoryListPage;
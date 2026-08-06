import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getWarehouses } from "../api/warehouseApi";
import { getGates } from "../api/gateApi";
import { getProducts } from "../api/productApi";
import { getInventoryBatches } from "../api/inventoryApi";
import { createStockOut } from "../api/stockOutApi";

/*
|--------------------------------------------------------------------------
| Lấy ngày hiện tại theo định dạng YYYY-MM-DD
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| Chuyển ngày về timestamp UTC, chỉ giữ năm - tháng - ngày
|--------------------------------------------------------------------------
*/

function toDateOnlyTimestamp(value) {
  if (!value) {
    return null;
  }

  const stringValue = String(value);

  const matchedDate = stringValue.match(
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

/*
|--------------------------------------------------------------------------
| Cộng số ngày vào ngày dạng YYYY-MM-DD
|--------------------------------------------------------------------------
*/

function addDaysToDateOnly(
  value,
  daysToAdd
) {
  const timestamp =
    toDateOnlyTimestamp(value);

  if (timestamp === null) {
    return null;
  }

  const resultDate = new Date(
    timestamp +
      Number(daysToAdd) *
        24 *
        60 *
        60 *
        1000
  );

  return resultDate
    .toISOString()
    .slice(0, 10);
}

/*
|--------------------------------------------------------------------------
| Chuyển giá trị MySQL boolean thành boolean JavaScript
|--------------------------------------------------------------------------
*/

function toBooleanFlag(
  value,
  defaultValue = false
) {
  if (
    value === true ||
    value === 1 ||
    value === "1"
  ) {
    return true;
  }

  if (
    value === false ||
    value === 0 ||
    value === "0"
  ) {
    return false;
  }

  return defaultValue;
}

function isBooleanFlagValue(value) {
  return [
    true,
    false,
    1,
    0,
    "1",
    "0",
  ].includes(value);
}

/*
|--------------------------------------------------------------------------
| Định dạng ngày
|--------------------------------------------------------------------------
*/

function formatDate(value) {
  const timestamp =
    toDateOnlyTimestamp(value);

  if (timestamp === null) {
    return "Không xác định";
  }

  return new Date(timestamp)
    .toLocaleDateString(
      "vi-VN",
      {
        timeZone: "UTC",
      }
    );
}

function StockOutCreatePage() {
  const navigate = useNavigate();

  const [
    warehouses,
    setWarehouses,
  ] = useState([]);

  const [
    gates,
    setGates,
  ] = useState([]);

  const [
    products,
    setProducts,
  ] = useState([]);

  const [
    warehouseBatches,
    setWarehouseBatches,
  ] = useState([]);

  const [
    formData,
    setFormData,
  ] = useState({
    warehouse_id: "",
    gate_id: "",
    export_date:
      getTodayInputValue(),
    export_rule: "FIFO",
    note: "",
  });

  const [
    details,
    setDetails,
  ] = useState([
    {
      product_id: "",
      quantity: "",
    },
  ]);

  const [
    loadingData,
    setLoadingData,
  ] = useState(true);

  const [
    loadingInventory,
    setLoadingInventory,
  ] = useState(false);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (!formData.warehouse_id) {
      setWarehouseBatches([]);
      return;
    }

    loadWarehouseInventory(
      formData.warehouse_id
    );
  }, [formData.warehouse_id]);

  /*
  |--------------------------------------------------------------------------
  | Tải dữ liệu ban đầu
  |--------------------------------------------------------------------------
  */

  async function loadInitialData() {
    try {
      setLoadingData(true);
      setError("");

      const [
        warehouseData,
        gateData,
        productData,
      ] = await Promise.all([
        getWarehouses(),

        getGates(),

        getProducts({
          page: 1,
          limit: 100,
          status: "active",
          sort_by: "name_asc",
        }),
      ]);

      setWarehouses(
        Array.isArray(
          warehouseData
        )
          ? warehouseData
          : []
      );

      setGates(
        Array.isArray(gateData)
          ? gateData
          : []
      );

      setProducts(
        Array.isArray(
          productData?.products
        )
          ? productData.products
          : []
      );
    } catch (err) {
      console.error(
        "Lỗi tải dữ liệu tạo phiếu xuất:",
        err
      );

      setWarehouses([]);
      setGates([]);
      setProducts([]);

      setError(
        err.response?.data
          ?.message ||
          "Không thể tải dữ liệu tạo phiếu xuất."
      );
    } finally {
      setLoadingData(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Tải tồn kho của kho
  |--------------------------------------------------------------------------
  */

  async function loadWarehouseInventory(
    warehouseId
  ) {
    try {
      setLoadingInventory(true);
      setError("");

      const batchData =
        await getInventoryBatches({
          warehouse_id:
            warehouseId,
        });

      const batches =
        Array.isArray(batchData)
          ? batchData
          : Array.isArray(
                batchData?.batches
              )
            ? batchData.batches
            : [];

      setWarehouseBatches(
        batches
      );
    } catch (err) {
      console.error(
        "Lỗi tải tồn kho của kho:",
        err
      );

      setWarehouseBatches([]);

      setError(
        err.response?.data
          ?.message ||
          "Không thể tải số lượng tồn kho của kho đã chọn."
      );
    } finally {
      setLoadingInventory(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Kiểm tra dữ liệu container của lô
  |--------------------------------------------------------------------------
  */

  function hasValidContainerData(
    batch
  ) {
    const quantity = Number(
      batch.quantity || 0
    );

    const containerQuantity =
      Number(
        batch.container_quantity ||
          0
      );

    const baseQuantityPerContainer =
      Number(
        batch
          .base_quantity_per_container ||
          0
      );

    if (
      quantity <= 0 ||
      !Number.isInteger(
        baseQuantityPerContainer
      ) ||
      baseQuantityPerContainer <= 0
    ) {
      return false;
    }

    const expectedContainerQuantity =
      Math.ceil(
        quantity /
          baseQuantityPerContainer
      );

    return (
      containerQuantity ===
      expectedContainerQuantity
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Kiểm tra lô có thuộc phạm vi ngày xuất không
  |--------------------------------------------------------------------------
  |
  | Hàm này chỉ kiểm tra:
  | - còn hàng;
  | - đã đến ngày nhập;
  | - chưa hết hạn sử dụng.
  |
  | Các lỗi giá, container và chính sách được kiểm tra khi tính dự kiến.
  |
  */

  function isBatchDateEligible(
    batch
  ) {
    const exportDateTimestamp =
      toDateOnlyTimestamp(
        formData.export_date
      );

    const importDateTimestamp =
      toDateOnlyTimestamp(
        batch.import_date
      );

    if (
      exportDateTimestamp ===
        null ||
      importDateTimestamp ===
        null ||
      Number(
        batch.quantity || 0
      ) <= 0
    ) {
      return false;
    }

    if (
      importDateTimestamp >
      exportDateTimestamp
    ) {
      return false;
    }

    if (batch.expiry_date) {
      const expiryDateTimestamp =
        toDateOnlyTimestamp(
          batch.expiry_date
        );

      if (
        expiryDateTimestamp ===
          null ||
        expiryDateTimestamp <
          exportDateTimestamp
      ) {
        return false;
      }
    }

    return true;
  }

  /*
  |--------------------------------------------------------------------------
  | Kiểm tra dữ liệu nghiệp vụ của lô
  |--------------------------------------------------------------------------
  */

  function getBatchDataError(
    batch
  ) {
    if (
      !hasValidContainerData(
        batch
      )
    ) {
      return (
        `Lô ${
          batch.batch_code ||
          batch.id
        } có dữ liệu container ` +
        "không khớp với số lượng tồn."
      );
    }

    const storageUnitPrice =
      Number(
        batch.storage_unit_price
      );

    if (
      !Number.isFinite(
        storageUnitPrice
      ) ||
      storageUnitPrice <= 0
    ) {
      return (
        `Lô ${
          batch.batch_code ||
          batch.id
        } chưa có đơn giá ` +
        "lưu kho đã chốt hợp lệ."
      );
    }

    const storagePolicyId =
      Number(
        batch.storage_policy_id
      );

    if (
      !Number.isInteger(
        storagePolicyId
      ) ||
      storagePolicyId <= 0
    ) {
      return (
        `Lô ${
          batch.batch_code ||
          batch.id
        } chưa có chính sách ` +
        "lưu kho đã chốt."
      );
    }

    const maxStorageDays =
      Number(
        batch.max_storage_days
      );

    if (
      !Number.isInteger(
        maxStorageDays
      ) ||
      maxStorageDays <= 0
    ) {
      return (
        `Lô ${
          batch.batch_code ||
          batch.id
        } chưa có thời hạn ` +
        "lưu kho hợp lệ."
      );
    }

    const overdueMultiplier =
      Number(
        batch.overdue_multiplier
      );

    if (
      !Number.isFinite(
        overdueMultiplier
      ) ||
      overdueMultiplier < 1
    ) {
      return (
        `Lô ${
          batch.batch_code ||
          batch.id
        } có hệ số phí ` +
        "quá hạn không hợp lệ."
      );
    }

    if (
      !isBooleanFlagValue(
        batch.allow_overdue_export
      )
    ) {
      return (
        `Lô ${
          batch.batch_code ||
          batch.id
        } chưa có quy định ` +
        "cho phép xuất quá hạn."
      );
    }

    if (
      !isBooleanFlagValue(
        batch.require_overdue_note
      )
    ) {
      return (
        `Lô ${
          batch.batch_code ||
          batch.id
        } chưa có quy định ` +
        "ghi chú khi xuất quá hạn."
      );
    }

    return "";
  }

  /*
  |--------------------------------------------------------------------------
  | Tính thông tin thời gian lưu của một lô
  |--------------------------------------------------------------------------
  */

  function getBatchStorageInfo(
    batch
  ) {
    const exportDateTimestamp =
      toDateOnlyTimestamp(
        formData.export_date
      );

    const importDateTimestamp =
      toDateOnlyTimestamp(
        batch.import_date
      );

    const maxStorageDays =
      Number(
        batch.max_storage_days
      );

    const overdueMultiplier =
      Number(
        batch.overdue_multiplier
      );

    if (
      exportDateTimestamp ===
        null ||
      importDateTimestamp ===
        null ||
      exportDateTimestamp <
        importDateTimestamp ||
      !Number.isInteger(
        maxStorageDays
      ) ||
      maxStorageDays <= 0
    ) {
      return null;
    }

    const millisecondsPerDay =
      24 * 60 * 60 * 1000;

    const storageDays =
      Math.max(
        1,

        Math.floor(
          (
            exportDateTimestamp -
            importDateTimestamp
          ) /
            millisecondsPerDay
        ) + 1
      );

    const regularStorageDays =
      Math.min(
        storageDays,
        maxStorageDays
      );

    const overdueStorageDays =
      Math.max(
        storageDays -
          maxStorageDays,
        0
      );

    const calculatedDueDate =
      addDaysToDateOnly(
        batch.import_date,
        maxStorageDays - 1
      );

    return {
      storageDays,

      regularStorageDays,

      overdueStorageDays,

      isOverdue:
        overdueStorageDays > 0,

      overdueMultiplier,

      storageDueDate:
        batch.storage_due_date ||
        calculatedDueDate,

      allowOverdueExport:
        toBooleanFlag(
          batch.allow_overdue_export
        ),

      requireOverdueNote:
        toBooleanFlag(
          batch.require_overdue_note
        ),
    };
  }

  /*
  |--------------------------------------------------------------------------
  | Các lô còn hàng, đã nhập và chưa hết hạn sử dụng
  |--------------------------------------------------------------------------
  */

  const candidateBatches =
    useMemo(
      () =>
        warehouseBatches.filter(
          (batch) =>
            isBatchDateEligible(
              batch
            )
        ),
      [
        warehouseBatches,
        formData.export_date,
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | Đếm lô bị loại vì ngày nhập hoặc hạn sử dụng
  |--------------------------------------------------------------------------
  */

  const excludedDateBatchCount =
    useMemo(
      () =>
        warehouseBatches.filter(
          (batch) =>
            Number(
              batch.quantity ||
                0
            ) > 0 &&
            !isBatchDateEligible(
              batch
            )
        ).length,
      [
        warehouseBatches,
        formData.export_date,
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | Đếm lô có dữ liệu nghiệp vụ lỗi
  |--------------------------------------------------------------------------
  */

  const invalidDataBatchCount =
    useMemo(
      () =>
        candidateBatches.filter(
          (batch) =>
            Boolean(
              getBatchDataError(
                batch
              )
            )
        ).length,
      [
        candidateBatches,
        formData.export_date,
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | Đếm lô quá hạn nhưng không được phép xuất
  |--------------------------------------------------------------------------
  */

  const blockedOverdueBatchCount =
    useMemo(
      () =>
        candidateBatches.filter(
          (batch) => {
            if (
              getBatchDataError(
                batch
              )
            ) {
              return false;
            }

            const storageInfo =
              getBatchStorageInfo(
                batch
              );

            return (
              storageInfo?.isOverdue &&
              !storageInfo
                .allowOverdueExport
            );
          }
        ).length,
      [
        candidateBatches,
        formData.export_date,
      ]
    );

  /*
  |--------------------------------------------------------------------------
  | Tổng tồn có thể được backend xét theo từng sản phẩm
  |--------------------------------------------------------------------------
  */

  const warehouseInventory =
    useMemo(
      () =>
        candidateBatches.reduce(
          (
            result,
            batch
          ) => {
            const productId =
              String(
                batch.product_id
              );

            const quantity =
              Number(
                batch.quantity ||
                  0
              );

            const containerQuantity =
              Number(
                batch
                  .container_quantity ||
                  0
              );

            if (
              !result[productId]
            ) {
              result[productId] = {
                quantity: 0,
                container_quantity:
                  0,
              };
            }

            result[
              productId
            ].quantity += quantity;

            result[
              productId
            ].container_quantity +=
              containerQuantity;

            return result;
          },
          {}
        ),
      [candidateBatches]
    );

  /*
  |--------------------------------------------------------------------------
  | Xử lý thay đổi thông tin chung
  |--------------------------------------------------------------------------
  */

  function handleFormChange(
    event
  ) {
    const {
      name,
      value,
    } = event.target;

    setFormData(
      (previous) => ({
        ...previous,

        [name]: value,

        ...(name ===
        "warehouse_id"
          ? {
              gate_id: "",
            }
          : {}),
      })
    );

    if (
      name === "warehouse_id"
    ) {
      setDetails(
        (
          previousDetails
        ) =>
          previousDetails.map(
            (item) => ({
              ...item,

              product_id: "",

              quantity: "",
            })
          )
      );

      setWarehouseBatches([]);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Xử lý thay đổi dòng sản phẩm
  |--------------------------------------------------------------------------
  */

  function handleDetailChange(
    index,
    event
  ) {
    const {
      name,
      value,
    } = event.target;

    setDetails(
      (
        previousDetails
      ) =>
        previousDetails.map(
          (
            item,
            itemIndex
          ) => {
            if (
              itemIndex !==
              index
            ) {
              return item;
            }

            if (
              name ===
              "product_id"
            ) {
              return {
                ...item,

                product_id:
                  value,

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

  function addDetailRow() {
    setDetails(
      (previous) => [
        ...previous,

        {
          product_id: "",
          quantity: "",
        },
      ]
    );
  }

  function removeDetailRow(
    index
  ) {
    if (
      details.length === 1
    ) {
      alert(
        "Phiếu xuất phải có ít nhất một sản phẩm."
      );

      return;
    }

    setDetails(
      (previous) =>
        previous.filter(
          (
            _,
            itemIndex
          ) =>
            itemIndex !==
            index
        )
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Lấy tổng tồn theo sản phẩm
  |--------------------------------------------------------------------------
  */

  function getAvailableQuantity(
    productId
  ) {
    if (
      !productId ||
      !formData.warehouse_id
    ) {
      return 0;
    }

    return Number(
      warehouseInventory[
        String(productId)
      ]?.quantity || 0
    );
  }

  function getAvailableContainers(
    productId
  ) {
    if (
      !productId ||
      !formData.warehouse_id
    ) {
      return 0;
    }

    return Number(
      warehouseInventory[
        String(productId)
      ]?.container_quantity ||
        0
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Sắp xếp lô FIFO hoặc FEFO
  |--------------------------------------------------------------------------
  */

  function getSortedProductBatches(
    productId
  ) {
    const productBatches =
      candidateBatches.filter(
        (batch) =>
          String(
            batch.product_id
          ) ===
          String(productId)
      );

    return [
      ...productBatches,
    ].sort(
      (
        firstBatch,
        secondBatch
      ) => {
        if (
          formData.export_rule ===
          "FEFO"
        ) {
          const firstHasExpiry =
            Boolean(
              firstBatch.expiry_date
            );

          const secondHasExpiry =
            Boolean(
              secondBatch.expiry_date
            );

          if (
            firstHasExpiry &&
            !secondHasExpiry
          ) {
            return -1;
          }

          if (
            !firstHasExpiry &&
            secondHasExpiry
          ) {
            return 1;
          }

          if (
            firstHasExpiry &&
            secondHasExpiry
          ) {
            const firstExpiryTime =
              toDateOnlyTimestamp(
                firstBatch.expiry_date
              );

            const secondExpiryTime =
              toDateOnlyTimestamp(
                secondBatch.expiry_date
              );

            if (
              firstExpiryTime !==
              secondExpiryTime
            ) {
              return (
                firstExpiryTime -
                secondExpiryTime
              );
            }
          }
        }

        const firstImportTime =
          toDateOnlyTimestamp(
            firstBatch.import_date
          );

        const secondImportTime =
          toDateOnlyTimestamp(
            secondBatch.import_date
          );

        if (
          firstImportTime !==
          secondImportTime
        ) {
          return (
            firstImportTime -
            secondImportTime
          );
        }

        return (
          Number(
            firstBatch.id ||
              0
          ) -
          Number(
            secondBatch.id ||
              0
          )
        );
      }
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Tính dự kiến xuất kho cho một sản phẩm
  |--------------------------------------------------------------------------
  */

  function estimateStockOut(
    item
  ) {
    const emptyResult = {
      issuedContainers: 0,

      regularStorageAmount:
        0,

      overdueStorageAmount:
        0,

      totalStorageAmount:
        0,

      remainingQuantity: 0,

      hasOverdueBatch:
        false,

      requiresOverdueNote:
        false,

      blockedReason: "",

      blockedBatchCode:
        "",

      maxOverdueDays: 0,

      usedBatchCount: 0,
    };

    if (
      !item.product_id ||
      !item.quantity
    ) {
      return emptyResult;
    }

    const requestedQuantity =
      Number(item.quantity);

    if (
      !Number.isInteger(
        requestedQuantity
      ) ||
      requestedQuantity <= 0
    ) {
      return {
        ...emptyResult,

        remainingQuantity:
          Math.max(
            requestedQuantity ||
              0,
            0
          ),
      };
    }

    let remainingQuantity =
      requestedQuantity;

    let issuedContainers =
      0;

    let regularStorageAmount =
      0;

    let overdueStorageAmount =
      0;

    let hasOverdueBatch =
      false;

    let requiresOverdueNote =
      false;

    let blockedReason = "";

    let blockedBatchCode =
      "";

    let maxOverdueDays = 0;

    let usedBatchCount = 0;

    const sortedBatches =
      getSortedProductBatches(
        item.product_id
      );

    for (
      const batch of sortedBatches
    ) {
      if (
        remainingQuantity <=
        0
      ) {
        break;
      }

      const availableQuantity =
        Number(
          batch.quantity ||
            0
        );

      if (
        availableQuantity <=
        0
      ) {
        continue;
      }

      /*
       * Backend sẽ dùng lô này theo thứ tự FIFO/FEFO,
       * vì vậy phải kiểm tra dữ liệu trước khi bỏ qua lô.
       */
      const batchDataError =
        getBatchDataError(
          batch
        );

      if (batchDataError) {
        blockedReason =
          batchDataError;

        blockedBatchCode =
          batch.batch_code ||
          String(batch.id);

        break;
      }

      const storageInfo =
        getBatchStorageInfo(
          batch
        );

      if (!storageInfo) {
        blockedReason =
          `Không thể tính thời gian lưu của lô ${
            batch.batch_code ||
            batch.id
          }.`;

        blockedBatchCode =
          batch.batch_code ||
          String(batch.id);

        break;
      }

      if (
        storageInfo.isOverdue &&
        !storageInfo
          .allowOverdueExport
      ) {
        blockedReason =
          `Lô ${
            batch.batch_code ||
            batch.id
          } đã quá thời hạn lưu kho ` +
          "và chính sách không cho phép xuất quá hạn.";

        blockedBatchCode =
          batch.batch_code ||
          String(batch.id);

        break;
      }

      const storedContainerQuantity =
        Number(
          batch
            .container_quantity ||
            0
        );

      const baseQuantityPerContainer =
        Number(
          batch
            .base_quantity_per_container ||
            0
        );

      const storageUnitPrice =
        Number(
          batch.storage_unit_price ||
            0
        );

      const issuedQuantity =
        Math.min(
          availableQuantity,
          remainingQuantity
        );

      const remainingBatchQuantity =
        availableQuantity -
        issuedQuantity;

      const newContainerQuantity =
        remainingBatchQuantity <=
        0
          ? 0
          : Math.ceil(
              remainingBatchQuantity /
                baseQuantityPerContainer
            );

      const releasedContainers =
        Math.max(
          storedContainerQuantity -
            newContainerQuantity,
          0
        );

      if (
        storageInfo.isOverdue
      ) {
        hasOverdueBatch =
          true;

        maxOverdueDays =
          Math.max(
            maxOverdueDays,

            storageInfo
              .overdueStorageDays
          );

        if (
          storageInfo
            .requireOverdueNote
        ) {
          requiresOverdueNote =
            true;
        }
      }

      const batchRegularAmount =
        releasedContainers *
        storageInfo
          .regularStorageDays *
        storageUnitPrice;

      const batchOverdueAmount =
        releasedContainers *
        storageInfo
          .overdueStorageDays *
        storageUnitPrice *
        storageInfo
          .overdueMultiplier;

      issuedContainers +=
        releasedContainers;

      regularStorageAmount +=
        batchRegularAmount;

      overdueStorageAmount +=
        batchOverdueAmount;

      remainingQuantity -=
        issuedQuantity;

      usedBatchCount += 1;
    }

    return {
      issuedContainers,

      regularStorageAmount,

      overdueStorageAmount,

      totalStorageAmount:
        regularStorageAmount +
        overdueStorageAmount,

      remainingQuantity,

      hasOverdueBatch,

      requiresOverdueNote,

      blockedReason,

      blockedBatchCode,

      maxOverdueDays,

      usedBatchCount,
    };
  }

  /*
  |--------------------------------------------------------------------------
  | Kết quả dự kiến của tất cả dòng
  |--------------------------------------------------------------------------
  */

  const detailEstimates =
    useMemo(
      () =>
        details.map(
          (item) =>
            estimateStockOut(
              item
            )
        ),
      [
        details,
        candidateBatches,
        formData.export_date,
        formData.export_rule,
      ]
    );

  function isQuantityExceedingStock(
    item
  ) {
    if (
      !item.product_id ||
      !item.quantity
    ) {
      return false;
    }

    const quantity =
      Number(item.quantity);

    const availableQuantity =
      getAvailableQuantity(
        item.product_id
      );

    return (
      Number.isFinite(
        quantity
      ) &&
      quantity >
        availableQuantity
    );
  }

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

  /*
  |--------------------------------------------------------------------------
  | Tổng dự kiến
  |--------------------------------------------------------------------------
  */

  const totals = useMemo(
    () =>
      detailEstimates.reduce(
        (
          result,
          estimate,
          index
        ) => {
          const item =
            details[index];

          const hasInput =
            Boolean(
              item?.product_id
            ) &&
            Boolean(
              item?.quantity
            );

          const estimateIsValid =
            hasInput &&
            !estimate.blockedReason &&
            estimate
              .remainingQuantity ===
              0;

          return {
            issuedContainers:
              result.issuedContainers +
              (estimateIsValid
                ? estimate
                    .issuedContainers
                : 0),

            regularStorageAmount:
              result
                .regularStorageAmount +
              (estimateIsValid
                ? estimate
                    .regularStorageAmount
                : 0),

            overdueStorageAmount:
              result
                .overdueStorageAmount +
              (estimateIsValid
                ? estimate
                    .overdueStorageAmount
                : 0),

            totalStorageAmount:
              result
                .totalStorageAmount +
              (estimateIsValid
                ? estimate
                    .totalStorageAmount
                : 0),

            hasOverdueBatch:
              result.hasOverdueBatch ||
              (
                estimateIsValid &&
                estimate
                  .hasOverdueBatch
              ),

            requiresOverdueNote:
              result
                .requiresOverdueNote ||
              (
                estimateIsValid &&
                estimate
                  .requiresOverdueNote
              ),

            maxOverdueDays:
              Math.max(
                result.maxOverdueDays,

                estimateIsValid
                  ? estimate
                      .maxOverdueDays
                  : 0
              ),
          };
        },
        {
          issuedContainers: 0,

          regularStorageAmount:
            0,

          overdueStorageAmount:
            0,

          totalStorageAmount:
            0,

          hasOverdueBatch:
            false,

          requiresOverdueNote:
            false,

          maxOverdueDays: 0,
        }
      ),
    [
      detailEstimates,
      details,
    ]
  );

  /*
  |--------------------------------------------------------------------------
  | Gửi phiếu xuất
  |--------------------------------------------------------------------------
  */

  async function handleSubmit(
    event
  ) {
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

    if (
      toDateOnlyTimestamp(
        formData.export_date
      ) === null
    ) {
      setError(
        "Ngày xuất không hợp lệ."
      );

      return;
    }

    if (loadingInventory) {
      setError(
        "Dữ liệu tồn kho đang được tải. Vui lòng chờ trong giây lát."
      );

      return;
    }

    const invalidDetail =
      details.some(
        (item) => {
          const quantity =
            Number(
              item.quantity
            );

          return (
            !item.product_id ||
            !Number.isInteger(
              quantity
            ) ||
            quantity <= 0
          );
        }
      );

    if (invalidDetail) {
      setError(
        "Vui lòng chọn sản phẩm và nhập số lượng xuất là số nguyên dương."
      );

      return;
    }

    const duplicateProduct =
      details.some(
        (
          item,
          index
        ) =>
          details.findIndex(
            (
              otherItem
            ) =>
              String(
                otherItem
                  .product_id
              ) ===
              String(
                item.product_id
              )
          ) !== index
      );

    if (duplicateProduct) {
      setError(
        "Một sản phẩm chỉ được xuất một lần trong cùng phiếu."
      );

      return;
    }

    const insufficientItem =
      details.find(
        (item) => {
          const quantity =
            Number(
              item.quantity
            );

          const availableQuantity =
            getAvailableQuantity(
              item.product_id
            );

          return (
            quantity >
            availableQuantity
          );
        }
      );

    if (insufficientItem) {
      const selectedProduct =
        products.find(
          (product) =>
            String(
              product.id
            ) ===
            String(
              insufficientItem
                .product_id
            )
        );

      const availableQuantity =
        getAvailableQuantity(
          insufficientItem
            .product_id
        );

      setError(
        `Sản phẩm "${
          selectedProduct?.name ||
          "Không xác định"
        }" chỉ còn ${formatNumber(
          availableQuantity
        )} có thể xuất tại ngày đã chọn, không đủ để xuất ${formatNumber(
          insufficientItem.quantity
        )}.`
      );

      return;
    }

    const blockedEstimateIndex =
      detailEstimates.findIndex(
        (estimate) =>
          Boolean(
            estimate.blockedReason
          )
      );

    if (
      blockedEstimateIndex !==
      -1
    ) {
      const blockedEstimate =
        detailEstimates[
          blockedEstimateIndex
        ];

      setError(
        blockedEstimate
          .blockedReason
      );

      return;
    }

    const unresolvedEstimateIndex =
      detailEstimates.findIndex(
        (estimate) =>
          estimate
            .remainingQuantity >
          0
      );

    if (
      unresolvedEstimateIndex !==
      -1
    ) {
      const selectedItem =
        details[
          unresolvedEstimateIndex
        ];

      const selectedProduct =
        products.find(
          (product) =>
            String(
              product.id
            ) ===
            String(
              selectedItem
                .product_id
            )
        );

      setError(
        `Không thể phân bổ đủ lô cho sản phẩm "${
          selectedProduct?.name ||
          "Không xác định"
        }". Vui lòng tải lại dữ liệu tồn kho.`
      );

      return;
    }

    const requiresNote =
      detailEstimates.some(
        (estimate) =>
          estimate
            .requiresOverdueNote
      );

    if (
      requiresNote &&
      !formData.note.trim()
    ) {
      setError(
        "Phiếu có hàng quá thời hạn lưu kho. Vui lòng nhập ghi chú lý do xuất quá hạn."
      );

      return;
    }

    const payload = {
      warehouse_id:
        Number(
          formData.warehouse_id
        ),

      gate_id:
        Number(
          formData.gate_id
        ),

      export_date:
        formData.export_date,

      export_rule:
        formData.export_rule,

      note:
        formData.note.trim(),

      details:
        details.map(
          (item) => ({
            product_id:
              Number(
                item.product_id
              ),

            quantity:
              Number(
                item.quantity
              ),
          })
        ),
    };

    try {
      setSaving(true);

      const result =
        await createStockOut(
          payload
        );

      alert(
        result.message ||
          "Tạo phiếu xuất kho thành công."
      );

      navigate(
        "/stock-outs"
      );
    } catch (err) {
      console.error(
        "Lỗi tạo phiếu xuất:",
        err
      );

      setError(
        err.response?.data
          ?.message ||
          "Không thể tạo phiếu xuất kho."
      );
    } finally {
      setSaving(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Cổng xuất thuộc kho đã chọn
  |--------------------------------------------------------------------------
  */

  const availableGates =
    useMemo(
      () =>
        gates.filter(
          (gate) =>
            Number(
              gate.warehouse_id
            ) ===
              Number(
                formData.warehouse_id
              ) &&
            [
              "OUT",
              "BOTH",
            ].includes(
              String(
                gate.gate_type ||
                  ""
              ).toUpperCase()
            )
        ),
      [
        gates,
        formData.warehouse_id,
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
            Tạo phiếu xuất kho
          </h1>

          <p className="text-muted mb-0">
            Hệ thống tự chọn lô theo FIFO hoặc FEFO, tách phí trong hạn và phí quá hạn.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() =>
            navigate(
              "/stock-outs"
            )
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

      <form
        onSubmit={
          handleSubmit
        }
      >
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
                  value={
                    formData.gate_id
                  }
                  onChange={
                    handleFormChange
                  }
                  disabled={
                    !formData.warehouse_id ||
                    availableGates.length ===
                      0 ||
                    saving
                  }
                >
                  <option value="">
                    {!formData.warehouse_id
                      ? "Vui lòng chọn kho trước"
                      : availableGates.length ===
                          0
                        ? "Kho chưa có cổng xuất"
                        : "Chọn cổng xuất"}
                  </option>

                  {availableGates.map(
                    (gate) => (
                      <option
                        key={
                          gate.id
                        }
                        value={
                          gate.id
                        }
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
                  value={
                    formData.export_date
                  }
                  onChange={
                    handleFormChange
                  }
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
                  value={
                    formData.export_rule
                  }
                  onChange={
                    handleFormChange
                  }
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

                  {totals.requiresOverdueNote && (
                    <span className="text-danger ms-1">
                      *
                    </span>
                  )}
                </label>

                <input
                  id="stock-out-note"
                  type="text"
                  name="note"
                  className={`form-control ${
                    totals.requiresOverdueNote &&
                    !formData.note.trim()
                      ? "is-invalid"
                      : ""
                  }`}
                  value={
                    formData.note
                  }
                  onChange={
                    handleFormChange
                  }
                  placeholder={
                    totals.requiresOverdueNote
                      ? "Bắt buộc nhập lý do xuất hàng quá thời hạn lưu kho"
                      : "Nhập ghi chú phiếu xuất"
                  }
                  disabled={saving}
                />

                {totals.requiresOverdueNote &&
                  !formData.note.trim() && (
                    <div className="invalid-feedback">
                      Chính sách yêu cầu ghi chú lý do xuất hàng quá hạn.
                    </div>
                  )}
              </div>
            </div>
          </div>
        </div>

        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
              <div>
                <h5 className="card-title mb-1">
                  Chi tiết sản phẩm xuất
                </h5>

                <p className="text-muted small mb-0">
                  Phí được quyết toán theo số container thực sự được giải phóng.
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
                onClick={
                  addDetailRow
                }
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
              candidateBatches.length ===
                0 && (
                <div className="alert alert-warning">
                  Kho này chưa có lô hàng có thể xét xuất tại ngày đã chọn.
                </div>
              )}

            {formData.warehouse_id &&
              !loadingInventory &&
              excludedDateBatchCount >
                0 && (
                <div className="alert alert-warning">
                  Có{" "}
                  {formatNumber(
                    excludedDateBatchCount
                  )}{" "}
                  lô không được tính vào tồn có thể xuất vì chưa đến ngày nhập hoặc đã hết hạn sử dụng.
                </div>
              )}

            {formData.warehouse_id &&
              !loadingInventory &&
              invalidDataBatchCount >
                0 && (
                <div className="alert alert-danger">
                  Có{" "}
                  {formatNumber(
                    invalidDataBatchCount
                  )}{" "}
                  lô đang có dữ liệu container, đơn giá hoặc chính sách không hợp lệ. Phiếu sẽ bị chặn khi quy tắc FIFO/FEFO chọn đến các lô này.
                </div>
              )}

            {formData.warehouse_id &&
              !loadingInventory &&
              blockedOverdueBatchCount >
                0 && (
                <div className="alert alert-danger">
                  Có{" "}
                  {formatNumber(
                    blockedOverdueBatchCount
                  )}{" "}
                  lô đã quá thời hạn lưu kho và chính sách không cho phép xuất quá hạn.
                </div>
              )}

            {totals.hasOverdueBatch && (
              <div className="alert alert-warning">
                <strong>
                  Cảnh báo:
                </strong>{" "}
                Phiếu này có hàng đã quá thời hạn lưu kho tối đa{" "}
                <strong>
                  {formatNumber(
                    totals.maxOverdueDays
                  )}{" "}
                  ngày
                </strong>
                . Phần thời gian quá hạn được tính theo hệ số đã chốt trong từng lô.
              </div>
            )}

            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th>
                      Sản phẩm
                    </th>

                    <th>
                      Tồn có thể xét xuất
                    </th>

                    <th>
                      Container đang chiếm
                    </th>

                    <th>
                      Số lượng xuất
                    </th>

                    <th>
                      Container quyết toán
                    </th>

                    <th>
                      Phí trong hạn
                    </th>

                    <th>
                      Phí quá hạn
                    </th>

                    <th>
                      Tổng phí
                    </th>

                    <th>
                      Thao tác
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {details.map(
                    (
                      item,
                      index
                    ) => {
                      const availableQuantity =
                        getAvailableQuantity(
                          item.product_id
                        );

                      const availableContainers =
                        getAvailableContainers(
                          item.product_id
                        );

                      const estimate =
                        detailEstimates[
                          index
                        ] ||
                        estimateStockOut(
                          item
                        );

                      const exceedsStock =
                        isQuantityExceedingStock(
                          item
                        );

                      const rowHasError =
                        exceedsStock ||
                        Boolean(
                          estimate.blockedReason
                        );

                      const rowClassName =
                        rowHasError
                          ? "table-danger"
                          : estimate.hasOverdueBatch
                            ? "table-warning"
                            : "";

                      const hasCalculationInput =
                        Boolean(
                          item.product_id
                        ) &&
                        Boolean(
                          item.quantity
                        );

                      return (
                        <tr
                          key={
                            index
                          }
                          className={
                            rowClassName
                          }
                        >
                          <td
                            style={{
                              minWidth:
                                "300px",
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
                                saving ||
                                loadingInventory ||
                                !formData.warehouse_id
                              }
                            >
                              <option value="">
                                Chọn sản phẩm
                              </option>

                              {products.map(
                                (
                                  product
                                ) => {
                                  const stock =
                                    getAvailableQuantity(
                                      product.id
                                    );

                                  return (
                                    <option
                                      key={
                                        product.id
                                      }
                                      value={
                                        product.id
                                      }
                                      disabled={
                                        stock <=
                                        0
                                      }
                                    >
                                      {
                                        product.sku
                                      }{" "}
                                      -{" "}
                                      {
                                        product.name
                                      }{" "}
                                      - Tồn:{" "}
                                      {formatNumber(
                                        stock
                                      )}
                                    </option>
                                  );
                                }
                              )}
                            </select>

                            {estimate.blockedReason && (
                              <div className="small text-danger mt-2">
                                <i className="bi bi-exclamation-triangle me-1" />

                                {
                                  estimate.blockedReason
                                }
                              </div>
                            )}

                            {!estimate.blockedReason &&
                              estimate.hasOverdueBatch && (
                                <div className="small text-warning-emphasis mt-2">
                                  <i className="bi bi-clock-history me-1" />

                                  Có lô quá hạn tối đa{" "}
                                  {formatNumber(
                                    estimate.maxOverdueDays
                                  )}{" "}
                                  ngày.
                                </div>
                              )}

                            {!estimate.blockedReason &&
                              estimate.requiresOverdueNote && (
                                <div className="small text-danger mt-1">
                                  Bắt buộc ghi chú lý do xuất quá hạn.
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
                                <strong
                                  className={
                                    availableQuantity <=
                                    0
                                      ? "text-danger"
                                      : "text-success"
                                  }
                                >
                                  {formatNumber(
                                    availableQuantity
                                  )}
                                </strong>

                                <div className="small text-muted">
                                  Tại ngày{" "}
                                  {formatDate(
                                    formData.export_date
                                  )}
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
                                  {formatNumber(
                                    availableContainers
                                  )}
                                </strong>{" "}
                                container
                              </div>
                            )}
                          </td>

                          <td
                            style={{
                              minWidth:
                                "180px",
                            }}
                          >
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
                                exceedsStock
                                  ? "is-invalid"
                                  : ""
                              }`}
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
                                loadingInventory ||
                                !item.product_id ||
                                availableQuantity <=
                                  0
                              }
                            />

                            {exceedsStock && (
                              <div className="invalid-feedback">
                                Chỉ còn{" "}
                                {formatNumber(
                                  availableQuantity
                                )}{" "}
                                sản phẩm có thể xuất.
                              </div>
                            )}
                          </td>

                          <td className="text-nowrap">
                            {!hasCalculationInput ? (
                              <span className="text-muted">
                                Chưa tính
                              </span>
                            ) : estimate.blockedReason ? (
                              <span className="text-danger">
                                Bị chặn
                              </span>
                            ) : (
                              <strong>
                                {formatNumber(
                                  estimate.issuedContainers
                                )}{" "}
                                container
                              </strong>
                            )}
                          </td>

                          <td className="text-nowrap">
                            {!hasCalculationInput ? (
                              <span className="text-muted">
                                Chưa tính
                              </span>
                            ) : estimate.blockedReason ? (
                              <span className="text-danger">
                                Không thể tính
                              </span>
                            ) : (
                              <strong>
                                {formatCurrency(
                                  estimate.regularStorageAmount
                                )}
                              </strong>
                            )}
                          </td>

                          <td className="text-nowrap">
                            {!hasCalculationInput ? (
                              <span className="text-muted">
                                Chưa tính
                              </span>
                            ) : estimate.blockedReason ? (
                              <span className="text-danger">
                                Không thể tính
                              </span>
                            ) : (
                              <strong
                                className={
                                  estimate.overdueStorageAmount >
                                  0
                                    ? "text-danger"
                                    : ""
                                }
                              >
                                {formatCurrency(
                                  estimate.overdueStorageAmount
                                )}
                              </strong>
                            )}
                          </td>

                          <td className="text-nowrap">
                            {!hasCalculationInput ? (
                              <span className="text-muted">
                                Chưa tính
                              </span>
                            ) : estimate.blockedReason ? (
                              <span className="text-danger">
                                Không thể tính
                              </span>
                            ) : (
                              <strong className="text-success">
                                {formatCurrency(
                                  estimate.totalStorageAmount
                                )}
                              </strong>
                            )}
                          </td>

                          <td className="text-nowrap">
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

            <div className="row justify-content-end mt-4">
              <div className="col-lg-7">
                <div className="card bg-light border-0">
                  <div className="card-body">
                    <div className="d-flex justify-content-between mb-2">
                      <span>
                        Tổng container quyết toán
                      </span>

                      <strong className="text-primary">
                        {formatNumber(
                          totals.issuedContainers
                        )}{" "}
                        container
                      </strong>
                    </div>

                    <div className="d-flex justify-content-between mb-2">
                      <span>
                        Phí lưu kho trong hạn
                      </span>

                      <strong>
                        {formatCurrency(
                          totals.regularStorageAmount
                        )}
                      </strong>
                    </div>

                    <div className="d-flex justify-content-between mb-2">
                      <span>
                        Phí lưu kho quá hạn
                      </span>

                      <strong className="text-danger">
                        {formatCurrency(
                          totals.overdueStorageAmount
                        )}
                      </strong>
                    </div>

                    <hr />

                    <div className="d-flex justify-content-between">
                      <h5 className="mb-0">
                        Tổng phí dự kiến
                      </h5>

                      <h5 className="mb-0 text-success">
                        {formatCurrency(
                          totals.totalStorageAmount
                        )}
                      </h5>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="alert alert-info mb-0 mt-3">
              <strong>
                Cách quyết toán:
              </strong>{" "}
              Khi chỉ xuất một phần hàng nhưng container vẫn còn chứa hàng, container đó chưa được tính là giải phóng. Phí chỉ được ghi nhận khi số container đang chiếm thực sự giảm.
            </div>
          </div>
        </div>

        <div className="d-flex justify-content-end gap-2">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() =>
              navigate(
                "/stock-outs"
              )
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
              loadingInventory ||
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
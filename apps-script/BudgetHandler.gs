// BudgetHandler.gs — Core handlers for budget and financial tracking (14_Budget sheet).

function handleListBudget() {
  var repo = new SheetRepository("14_Budget", "BDG", "budgetId");
  return repo.getAll();
}

function handleCreateBudget(data, operatorUserId) {
  if (!data || !data.category) {
    throw new Error("Invalid payload: category is required.");
  }
  var repo = new SheetRepository("14_Budget", "BDG", "budgetId");

  var estimated = Number(data.estimatedBudget) || 0;
  var actual = Number(data.actualExpense) || 0;
  var paid = Number(data.amountPaid) || 0;
  var pending = actual - paid; // pendingAmount auto-calculation

  var newRecord = {
    eventId: data.eventId || "",
    category: data.category,
    description: data.description || "",
    estimatedBudget: estimated,
    actualExpense: actual,
    amountPaid: paid,
    pendingAmount: pending,
    vendor: data.vendor || "",
    sponsor: data.sponsor || "",
    invoiceUrl: data.invoiceUrl || "",
    approvalStatus: data.approvalStatus || "PENDING",
    approvedBy: data.approvedBy || ""
  };

  var inserted = repo.insert(newRecord);
  logAudit(operatorUserId, "budget.create", "Budget", inserted.budgetId, "", inserted, "SUCCESS");
  return inserted;
}

function handleUpdateBudget(budgetId, data, operatorUserId) {
  if (!budgetId || !data) {
    throw new Error("Missing budget ID or update payload.");
  }
  var repo = new SheetRepository("14_Budget", "BDG", "budgetId");
  var existing = repo.getById(budgetId);
  if (!existing) {
    throw new Error("Budget record not found with ID: " + budgetId);
  }

  var updateFields = {};
  if (data.hasOwnProperty("eventId")) updateFields.eventId = data.eventId;
  if (data.hasOwnProperty("category")) updateFields.category = data.category;
  if (data.hasOwnProperty("description")) updateFields.description = data.description;
  if (data.hasOwnProperty("estimatedBudget")) updateFields.estimatedBudget = Number(data.estimatedBudget) || 0;
  if (data.hasOwnProperty("actualExpense")) updateFields.actualExpense = Number(data.actualExpense) || 0;
  if (data.hasOwnProperty("amountPaid")) updateFields.amountPaid = Number(data.amountPaid) || 0;
  if (data.hasOwnProperty("vendor")) updateFields.vendor = data.vendor;
  if (data.hasOwnProperty("sponsor")) updateFields.sponsor = data.sponsor;
  if (data.hasOwnProperty("invoiceUrl")) updateFields.invoiceUrl = data.invoiceUrl;
  if (data.hasOwnProperty("approvalStatus")) updateFields.approvalStatus = data.approvalStatus;
  if (data.hasOwnProperty("approvedBy")) updateFields.approvedBy = data.approvedBy;

  // Recalculate pendingAmount
  var finalActual = updateFields.hasOwnProperty("actualExpense") ? updateFields.actualExpense : (Number(existing.actualExpense) || 0);
  var finalPaid = updateFields.hasOwnProperty("amountPaid") ? updateFields.amountPaid : (Number(existing.amountPaid) || 0);
  updateFields.pendingAmount = finalActual - finalPaid;

  var updated = repo.update(budgetId, updateFields);
  logAudit(operatorUserId, "budget.update", "Budget", budgetId, existing, updated, "SUCCESS");
  return updated;
}

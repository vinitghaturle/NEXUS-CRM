// NewsletterHandler.gs — Handlers for Newsletter campaigns (08_Newsletter sheet).

function handleListNewsletter() {
  var repo = new SheetRepository("08_Newsletter", "NWS", "newsletterId");
  return repo.getAll();
}

function handleCreateNewsletter(data, operatorUserId) {
  if (!data || !data.theme) {
    throw new Error("Invalid payload: theme is required.");
  }
  var repo = new SheetRepository("08_Newsletter", "NWS", "newsletterId");
  var newRecord = {
    month: data.month || "",
    year: data.year || "",
    theme: data.theme,
    contentOwner: data.contentOwner || "",
    designer: data.designer || "",
    deadline: data.deadline ? new Date(data.deadline) : "",
    approvalStatus: data.approvalStatus || "PENDING",
    published: data.published || "FALSE",
    publishedDate: data.publishedDate ? new Date(data.publishedDate) : "",
    driveUrl: data.driveUrl || "",
    remarks: data.remarks || ""
  };
  var inserted = repo.insert(newRecord);
  logAudit(operatorUserId, "newsletter.create", "Newsletter", inserted.newsletterId, "", inserted, "SUCCESS");
  return inserted;
}

function handleUpdateNewsletter(newsletterId, data, operatorUserId) {
  if (!newsletterId || !data) {
    throw new Error("Missing newsletter ID or update payload.");
  }
  var repo = new SheetRepository("08_Newsletter", "NWS", "newsletterId");
  var existing = repo.getById(newsletterId);
  if (!existing) {
    throw new Error("Newsletter campaign not found with ID: " + newsletterId);
  }

  var updateFields = {};
  if (data.hasOwnProperty("month")) updateFields.month = data.month;
  if (data.hasOwnProperty("year")) updateFields.year = data.year;
  if (data.hasOwnProperty("theme")) updateFields.theme = data.theme;
  if (data.hasOwnProperty("contentOwner")) updateFields.contentOwner = data.contentOwner;
  if (data.hasOwnProperty("designer")) updateFields.designer = data.designer;
  if (data.hasOwnProperty("deadline")) updateFields.deadline = data.deadline ? new Date(data.deadline) : "";
  if (data.hasOwnProperty("approvalStatus")) updateFields.approvalStatus = data.approvalStatus;
  if (data.hasOwnProperty("published")) updateFields.published = data.published;
  if (data.hasOwnProperty("publishedDate")) updateFields.publishedDate = data.publishedDate ? new Date(data.publishedDate) : "";
  if (data.hasOwnProperty("driveUrl")) updateFields.driveUrl = data.driveUrl;
  if (data.hasOwnProperty("remarks")) updateFields.remarks = data.remarks;

  var updated = repo.update(newsletterId, updateFields);

  if (data.hasOwnProperty("published") && data.published !== existing.published) {
    logAudit(operatorUserId, "newsletter.publish", "Newsletter", newsletterId, existing.published, data.published, "SUCCESS");
  }

  return updated;
}

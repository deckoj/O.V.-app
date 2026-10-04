/* =========================================
   OV — APP.JS
   MVP 0.4
========================================= */

let transactionType = "income";
let editingTransactionId = null;
let selectedTransactionId = null;

const OV_CONFIG = {
  defaultCurrency: "MXN",
  locale: "es-MX"
};


/* =========================================
   EMPRESAS
========================================= */

let companies =
  JSON.parse(localStorage.getItem("ov_companies")) || [
    {
      id: "grupo-decko",
      name: "Grupo Decko",
      currency: "MXN"
    }
  ];

companies = companies.map(company => ({
  ...company,
  currency: company.currency || "MXN"
}));

let activeCompanyId =
  localStorage.getItem("ov_active_company") ||
  companies[0].id;


/* =========================================
   MOVIMIENTOS / MIGRACIÓN
========================================= */

let oldTransactions =
  JSON.parse(localStorage.getItem("ov_transactions")) || [];

let companyTransactions =
  JSON.parse(localStorage.getItem("ov_company_transactions"));

if (!companyTransactions) {
  companyTransactions = {};
  companyTransactions["grupo-decko"] = oldTransactions;
}

companies.forEach(company => {
  if (!companyTransactions[company.id]) {
    companyTransactions[company.id] = [];
  }
});


/* =========================================
   UTILIDADES PRINCIPALES
========================================= */

function getActiveCompany() {
  return (
    companies.find(company => company.id === activeCompanyId) ||
    companies[0]
  );
}

function getCurrency() {
  const company = getActiveCompany();

  return company?.currency || OV_CONFIG.defaultCurrency;
}

function getTransactions() {
  if (!companyTransactions[activeCompanyId]) {
    companyTransactions[activeCompanyId] = [];
  }

  return companyTransactions[activeCompanyId];
}

function setText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value;
  }
}


/* =========================================
   DINERO
========================================= */

function money(number, currency = getCurrency()) {
  const value = Number(number) || 0;

  const formatted = new Intl.NumberFormat(
    OV_CONFIG.locale,
    {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  ).format(value);

  return `${formatted} ${currency}`;
}


/* =========================================
   CAMPO DE MONTO
========================================= */

function cleanAmount(value) {
  if (!value) return "";

  return String(value)
    .replace(/MXN/gi, "")
    .replace(/\$/g, "")
    .replace(/,/g, "")
    .replace(/\s/g, "")
    .replace(/[^\d.]/g, "");
}


function getAmountValue() {
  const input = document.getElementById("amount");

  if (!input) return 0;

  const cleaned = cleanAmount(input.value);

  return Number(cleaned) || 0;
}


function formatAmountInput(value) {
  let clean = cleanAmount(value);

  if (!clean) return "";

  const firstDot = clean.indexOf(".");

  if (firstDot !== -1) {
    clean =
      clean.substring(0, firstDot + 1) +
      clean.substring(firstDot + 1).replace(/\./g, "");
  }

  let [integerPart, decimalPart] = clean.split(".");

  integerPart = integerPart.replace(/^0+(?=\d)/, "");

  if (!integerPart) {
    integerPart = "0";
  }

  const formattedInteger =
    Number(integerPart).toLocaleString("en-US");

  if (clean.includes(".")) {
    decimalPart = (decimalPart || "").slice(0, 2);

    return `${formattedInteger}.${decimalPart}`;
  }

  return formattedInteger;
}


function setupAmountInput() {
  const input = document.getElementById("amount");

  if (!input) return;

  input.type = "text";
  input.inputMode = "decimal";
  input.autocomplete = "off";


  /*
    MIENTRAS ESCRIBES:
    180000 -> 180,000
  */

  input.addEventListener("input", () => {
    input.value = formatAmountInput(input.value);

    const end = input.value.length;

    try {
      input.setSelectionRange(end, end);
    } catch (error) {}
  });


  /*
    CUANDO SALES:
    $180,000.00 MXN
  */

  input.addEventListener("blur", () => {
    const value = getAmountValue();

    if (!value) {
      input.value = "";
      return;
    }

    input.value = money(value);
  });


  /*
    CUANDO REGRESAS:
    180,000
  */

  input.addEventListener("focus", () => {
    const value = getAmountValue();

    if (!value) {
      input.value = "";
      return;
    }

    let editable = value.toFixed(2);

    if (editable.endsWith(".00")) {
      editable = editable.slice(0, -3);
    }

    input.value = formatAmountInput(editable);

    setTimeout(() => {
      const end = input.value.length;

      try {
        input.setSelectionRange(end, end);
      } catch (error) {}
    }, 0);
  });
}


/* =========================================
   GUARDAR DATOS
========================================= */

function saveData() {
  localStorage.setItem(
    "ov_companies",
    JSON.stringify(companies)
  );

  localStorage.setItem(
    "ov_active_company",
    activeCompanyId
  );

  localStorage.setItem(
    "ov_company_transactions",
    JSON.stringify(companyTransactions)
  );
}


/* =========================================
   SELECTOR DE EMPRESA
========================================= */

function renderCompanySelector() {
  const select = document.getElementById("companySelect");

  if (!select) return;

  select.innerHTML = "";

  companies.forEach(company => {
    const option = document.createElement("option");

    option.value = company.id;
    option.textContent = company.name;
    option.selected = company.id === activeCompanyId;

    select.appendChild(option);
  });
}


function changeCompany() {
  const select = document.getElementById("companySelect");

  if (!select) return;

  activeCompanyId = select.value;

  editingTransactionId = null;
  selectedTransactionId = null;

  clearMovementForm();
  setType("income");

  saveData();
  updateCompanyUI();
  updateMovementFormUI();
  calculate();

  showToast("Empresa cambiada");
}


/* =========================================
   CREAR EMPRESA
========================================= */

function createCompany() {
  const name = prompt(
    "¿Cómo se llama la nueva empresa?"
  );

  if (!name) return;

  const cleanName = name.trim();

  if (!cleanName) return;

  const alreadyExists = companies.some(
    company =>
      company.name.toLowerCase() ===
      cleanName.toLowerCase()
  );

  if (alreadyExists) {
    alert("Ya existe una empresa con ese nombre.");
    return;
  }

  const id = "company-" + Date.now();

  companies.push({
    id: id,
    name: cleanName,
    currency: "MXN"
  });

  companyTransactions[id] = [];

  activeCompanyId = id;

  saveData();

  renderCompanySelector();
  updateCompanyUI();
  calculate();

  showToast("Empresa creada");
}


/* =========================================
   ELIMINAR EMPRESA
========================================= */

function deleteCompany(id) {
  if (companies.length === 1) {
    alert("OV debe tener al menos una empresa.");
    return;
  }

  const company = companies.find(
    item => item.id === id
  );

  if (!company) return;

  const confirmed = confirm(
    `¿Eliminar "${company.name}"?\n\n` +
    `También se eliminarán todos sus movimientos ` +
    `guardados en este dispositivo.`
  );

  if (!confirmed) return;

  companies = companies.filter(
    item => item.id !== id
  );

  delete companyTransactions[id];

  if (activeCompanyId === id) {
    activeCompanyId = companies[0].id;
  }

  editingTransactionId = null;
  selectedTransactionId = null;

  saveData();

  renderCompanySelector();
  updateCompanyUI();
  calculate();

  showToast("Empresa eliminada");
}


/* =========================================
   LISTA DE EMPRESAS
========================================= */

function renderCompanyList() {
  const container = document.getElementById("companyList");

  if (!container) return;

  container.innerHTML = "";

  companies.forEach(company => {
    const transactions =
      companyTransactions[company.id] || [];

    const row = document.createElement("div");
    row.className = "companyRow";

    const left = document.createElement("div");

    const strong = document.createElement("strong");
    strong.textContent = company.name;

    const br = document.createElement("br");

    const small = document.createElement("small");

    small.textContent =
      `${transactions.length} movimiento` +
      `${transactions.length === 1 ? "" : "s"} · ` +
      `${company.currency || "MXN"}`;

    left.appendChild(strong);
    left.appendChild(br);
    left.appendChild(small);


    const right = document.createElement("div");

    if (company.id === activeCompanyId) {
      const current = document.createElement("small");

      current.textContent = "Actual";

      right.appendChild(current);
    } else {
      const button = document.createElement("button");

      button.type = "button";
      button.className = "deleteButton";
      button.textContent = "Eliminar";

      button.onclick = () => deleteCompany(company.id);

      right.appendChild(button);
    }

    row.appendChild(left);
    row.appendChild(right);

    container.appendChild(row);
  });
}


/* =========================================
   UI DE EMPRESA
========================================= */

function updateCompanyUI() {
  const company = getActiveCompany();

  if (!company) return;

  setText(
    "companyTitle",
    company.name
  );

  setText(
    "movementCompanyText",
    `Historial de ${company.name}.`
  );

  setText(
    "addCompanyText",
    editingTransactionId
      ? `Editando movimiento de ${company.name} · ${getCurrency()}.`
      : `Registrando movimiento en ${company.name} · ${getCurrency()}.`
  );

  setText(
    "aiCompanyText",
    `Analizando la información registrada de ${company.name}.`
  );

  setText(
    "moreCompanyName",
    `${company.name} · ${getCurrency()}`
  );

  renderCompanyList();
}


/* =========================================
   CÁLCULOS
========================================= */

function calculate() {
  const transactions = getTransactions();

  let income = 0;
  let expense = 0;

  transactions.forEach(transaction => {
    const amount = Number(transaction.amount) || 0;

    if (transaction.type === "income") {
      income += amount;
    } else {
      expense += amount;
    }
  });

  const balance = income - expense;

  setText("income", money(income));
  setText("expense", money(expense));
  setText("balance", money(balance));
  setText("result", money(balance));

  renderTransactions();
}


/* =========================================
   CREAR MOVIMIENTO VISUAL
========================================= */

function createTransactionElement(transaction) {
  const wrapper = document.createElement("div");

  wrapper.className = "transaction";


  /*
    INFORMACIÓN
  */

  const info = document.createElement("div");

  info.className = "transactionInfo";

  const concept = document.createElement("strong");

  concept.textContent =
    transaction.concept || "Sin concepto";

  const details = document.createElement("small");

  details.textContent =
    `${transaction.category || "Otros"} · ` +
    `${formatDate(transaction.date)}`;

  info.appendChild(concept);
  info.appendChild(details);


  /*
    LADO DERECHO
  */

  const right = document.createElement("div");

  right.className = "transactionRight";


  const amount = document.createElement("div");

  amount.className =
    transaction.type === "income"
      ? "amountIncome"
      : "amountExpense";

  const sign =
    transaction.type === "income"
      ? "+"
      : "-";

  amount.textContent =
    `${sign}${money(transaction.amount)}`;


  /*
    BOTÓN ⋯
  */

  const menuButton = document.createElement("button");

  menuButton.type = "button";
  menuButton.className = "transactionMenuButton";
  menuButton.textContent = "⋯";

  menuButton.setAttribute(
    "aria-label",
    "Opciones del movimiento"
  );

  menuButton.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();

    openTransactionMenu(transaction.id);
  });


  right.appendChild(amount);
  right.appendChild(menuButton);

  wrapper.appendChild(info);
  wrapper.appendChild(right);

  return wrapper;
}


/* =========================================
   MOSTRAR MOVIMIENTOS
========================================= */

function renderTransactions() {
  const transactions = getTransactions();

  const sorted = [...transactions].sort(
    (a, b) => Number(b.id) - Number(a.id)
  );

  const recent =
    document.getElementById("recentTransactions");

  const all =
    document.getElementById("allTransactions");

  if (!recent || !all) return;

  recent.innerHTML = "";
  all.innerHTML = "";

  if (sorted.length === 0) {
    const recentEmpty = document.createElement("div");
    recentEmpty.className = "empty";
    recentEmpty.textContent =
      "Aún no hay movimientos en esta empresa.";

    const allEmpty = document.createElement("div");
    allEmpty.className = "empty";
    allEmpty.textContent =
      "Aún no hay movimientos en esta empresa.";

    recent.appendChild(recentEmpty);
    all.appendChild(allEmpty);

    return;
  }

  sorted.forEach((transaction, index) => {
    const allElement =
      createTransactionElement(transaction);

    all.appendChild(allElement);

    if (index < 3) {
      const recentElement =
        createTransactionElement(transaction);

      recent.appendChild(recentElement);
    }
  });
}


/* =========================================
   MENÚ ⋯
========================================= */

function openTransactionMenu(id) {
  const transaction = getTransactions().find(
    item => String(item.id) === String(id)
  );

  if (!transaction) return;

  selectedTransactionId = transaction.id;

  setText(
    "menuTransactionConcept",
    transaction.concept || "Movimiento"
  );

  const sign =
    transaction.type === "income"
      ? "+"
      : "-";

  setText(
    "menuTransactionAmount",
    `${sign}${money(transaction.amount)}`
  );

  const overlay =
    document.getElementById("transactionOverlay");

  if (overlay) {
    overlay.classList.remove("hidden");
  }

  document.body.style.overflow = "hidden";
}


function closeTransactionMenu(event) {
  if (
    event &&
    event.target &&
    event.target.id !== "transactionOverlay"
  ) {
    return;
  }

  const overlay =
    document.getElementById("transactionOverlay");

  if (overlay) {
    overlay.classList.add("hidden");
  }

  document.body.style.overflow = "";

  selectedTransactionId = null;
}


/* =========================================
   EDITAR DESDE MENÚ
========================================= */

function editSelectedTransaction() {
  if (selectedTransactionId === null) return;

  const id = selectedTransactionId;

  /*
    Cerramos visualmente el menú sin
    perder el ID antes de editar.
  */

  const overlay =
    document.getElementById("transactionOverlay");

  if (overlay) {
    overlay.classList.add("hidden");
  }

  document.body.style.overflow = "";

  selectedTransactionId = null;

  editTransaction(id);
}


function editTransaction(id) {
  const transaction = getTransactions().find(
    item => String(item.id) === String(id)
  );

  if (!transaction) {
    alert("No se encontró el movimiento.");
    return;
  }

  editingTransactionId = transaction.id;

  setType(
    transaction.type === "expense"
      ? "expense"
      : "income"
  );


  const amountInput =
    document.getElementById("amount");

  const conceptInput =
    document.getElementById("concept");

  const categoryInput =
    document.getElementById("category");

  const dateInput =
    document.getElementById("date");

  const notesInput =
    document.getElementById("notes");


  if (amountInput) {
    amountInput.value =
      money(transaction.amount);
  }

  if (conceptInput) {
    conceptInput.value =
      transaction.concept || "";
  }

  if (categoryInput) {
    const category =
      transaction.category || "Otros";

    const exists = Array.from(
      categoryInput.options
    ).some(
      option => option.value === category
    );

    categoryInput.value =
      exists ? category : "Otros";
  }

  if (dateInput) {
    dateInput.value =
      transaction.date || today();
  }

  if (notesInput) {
    notesInput.value =
      transaction.notes || "";
  }

  updateMovementFormUI();
  updateCompanyUI();

  const addNavButton =
    document.querySelectorAll(".navItem")[2];

  showPage("add", addNavButton);

  showToast("Editando movimiento");
}


/* =========================================
   ELIMINAR DESDE MENÚ
========================================= */

function deleteSelectedTransaction() {
  if (selectedTransactionId === null) return;

  const id = selectedTransactionId;

  const transaction = getTransactions().find(
    item => String(item.id) === String(id)
  );

  if (!transaction) {
    closeTransactionMenu();
    return;
  }

  const confirmed = confirm(
    `¿Eliminar este movimiento?\n\n` +
    `${transaction.concept}\n` +
    `${money(transaction.amount)}\n\n` +
    `Esta acción no se puede deshacer.`
  );

  if (!confirmed) return;

  companyTransactions[activeCompanyId] =
    getTransactions().filter(
      item => String(item.id) !== String(id)
    );

  if (
    editingTransactionId !== null &&
    String(editingTransactionId) === String(id)
  ) {
    editingTransactionId = null;
    clearMovementForm();
  }

  const overlay =
    document.getElementById("transactionOverlay");

  if (overlay) {
    overlay.classList.add("hidden");
  }

  document.body.style.overflow = "";

  selectedTransactionId = null;

  saveData();

  updateMovementFormUI();
  updateCompanyUI();
  calculate();

  showToast("Movimiento eliminado");
}


/* =========================================
   NUEVO MOVIMIENTO
========================================= */

function openNewMovement(button) {
  editingTransactionId = null;
  selectedTransactionId = null;

  clearMovementForm();

  setType("income");

  updateMovementFormUI();
  updateCompanyUI();

  showPage("add", button);
}


/* =========================================
   CANCELAR EDICIÓN
========================================= */

function cancelEdit(showMessage = true) {
  editingTransactionId = null;

  clearMovementForm();

  setType("income");

  updateMovementFormUI();
  updateCompanyUI();

  if (showMessage) {
    showToast("Edición cancelada");
  }
}


/* =========================================
   UI DEL FORMULARIO
========================================= */

function updateMovementFormUI() {
  const title =
    document.getElementById("movementFormTitle");

  const saveButton =
    document.getElementById("saveMovementButton");

  const cancelButton =
    document.getElementById("cancelEditButton");

  if (editingTransactionId !== null) {
    if (title) {
      title.textContent =
        "Editar movimiento";
    }

    if (saveButton) {
      saveButton.textContent =
        "Guardar cambios";
    }

    if (cancelButton) {
      cancelButton.classList.remove("hidden");
    }
  } else {
    if (title) {
      title.textContent =
        "Agregar movimiento";
    }

    if (saveButton) {
      saveButton.textContent =
        "Guardar movimiento";
    }

    if (cancelButton) {
      cancelButton.classList.add("hidden");
    }
  }
}


/* =========================================
   LIMPIAR FORMULARIO
========================================= */

function clearMovementForm() {
  const amount =
    document.getElementById("amount");

  const concept =
    document.getElementById("concept");

  const category =
    document.getElementById("category");

  const date =
    document.getElementById("date");

  const notes =
    document.getElementById("notes");

  if (amount) {
    amount.value = "";
  }

  if (concept) {
    concept.value = "";
  }

  if (category) {
    category.selectedIndex = 0;
  }

  if (date) {
    date.value = today();
  }

  if (notes) {
    notes.value = "";
  }
}


/* =========================================
   INGRESO / GASTO
========================================= */

function setType(type) {
  transactionType =
    type === "expense"
      ? "expense"
      : "income";

  const incomeButton =
    document.getElementById("incomeBtn");

  const expenseButton =
    document.getElementById("expenseBtn");

  if (incomeButton) {
    incomeButton.classList.toggle(
      "active",
      transactionType === "income"
    );
  }

  if (expenseButton) {
    expenseButton.classList.toggle(
      "active",
      transactionType === "expense"
    );
  }
}


/* =========================================
   GUARDAR / ACTUALIZAR MOVIMIENTO
========================================= */

function saveTransaction() {
  const amount = getAmountValue();

  const conceptElement =
    document.getElementById("concept");

  const categoryElement =
    document.getElementById("category");

  const dateElement =
    document.getElementById("date");

  const notesElement =
    document.getElementById("notes");


  const concept =
    conceptElement
      ? conceptElement.value.trim()
      : "";

  const category =
    categoryElement
      ? categoryElement.value
      : "Otros";

  const date =
    dateElement
      ? dateElement.value
      : today();

  const notes =
    notesElement
      ? notesElement.value.trim()
      : "";


  if (!amount || amount <= 0) {
    alert("Ingresa un monto válido.");
    return;
  }

  if (!concept) {
    alert("Escribe el concepto del movimiento.");
    return;
  }


  const transactions = getTransactions();


  /*
    ACTUALIZAR MOVIMIENTO EXISTENTE
  */

  if (editingTransactionId !== null) {
    const transaction = transactions.find(
      item =>
        String(item.id) ===
        String(editingTransactionId)
    );

    if (!transaction) {
      alert("No se encontró el movimiento.");
      return;
    }

    transaction.type = transactionType;
    transaction.amount = amount;
    transaction.currency = getCurrency();
    transaction.concept = concept;
    transaction.category = category;
    transaction.date = date || today();
    transaction.notes = notes;
    transaction.updatedAt = Date.now();

    editingTransactionId = null;

    showToast("Movimiento actualizado");
  }


  /*
    CREAR MOVIMIENTO NUEVO
  */

  else {
    transactions.push({
      id: Date.now(),

      type: transactionType,

      amount: amount,

      currency: getCurrency(),

      concept: concept,

      category: category,

      /*
        Estos campos quedan preparados
        para Clientes + Proyectos +
        clasificación futura con Finance.
      */

      client: "",
      project: "",

      source: "manual",

      classificationStatus: "manual",

      date: date || today(),

      notes: notes,

      createdAt: Date.now()
    });

    showToast("Movimiento guardado");
  }


  companyTransactions[activeCompanyId] =
    transactions;

  saveData();

  clearMovementForm();

  setType("income");

  updateMovementFormUI();
  updateCompanyUI();
  calculate();

  const homeButton =
    document.querySelectorAll(".navItem")[0];

  showPage("home", homeButton);
}


/* =========================================
   NAVEGACIÓN
========================================= */

function showPage(page, button) {
  document
    .querySelectorAll(".page")
    .forEach(element => {
      element.classList.remove("active");
    });

  const selectedPage =
    document.getElementById(page);

  if (selectedPage) {
    selectedPage.classList.add("active");
  }

  document
    .querySelectorAll(".navItem")
    .forEach(element => {
      element.classList.remove("active");
    });

  if (button) {
    button.classList.add("active");
  }

  if (page === "more") {
    renderCompanyList();
  }

  window.scrollTo({
    top: 0,
    behavior: "auto"
  });
}


/* =========================================
   TOAST
========================================= */

function showToast(message) {
  const toast =
    document.getElementById("toast");

  if (!toast) return;

  toast.textContent =
    message || "Guardado";

  toast.style.display = "block";

  clearTimeout(
    window.ovToastTimer
  );

  window.ovToastTimer =
    setTimeout(() => {
      toast.style.display = "none";
    }, 1800);
}


/* =========================================
   FINANCE
   MVP LOCAL
========================================= */

function askOV() {
  const input =
    document.getElementById("aiQuestion");

  const box =
    document.getElementById("aiAnswer");

  if (!input || !box) return;

  const question =
    input.value
      .trim()
      .toLowerCase();

  const transactions =
    getTransactions();

  let income = 0;
  let expense = 0;

  transactions.forEach(transaction => {
    const amount =
      Number(transaction.amount) || 0;

    if (transaction.type === "income") {
      income += amount;
    } else {
      expense += amount;
    }
  });

  const company =
    getActiveCompany();

  let response;


  if (!question) {
    response =
      "Escribe una pregunta sobre tus movimientos.";
  }

  else if (
    question.includes("cuántos movimientos") ||
    question.includes("cuantos movimientos")
  ) {
    response =
      `${company.name} tiene ` +
      `${transactions.length} movimiento` +
      `${transactions.length === 1 ? "" : "s"} registrado` +
      `${transactions.length === 1 ? "" : "s"}.`;
  }

  else if (
    question.includes("gasto") ||
    question.includes("egreso")
  ) {
    response =
      `${company.name} tiene ` +
      `${money(expense)} registrados en gastos.`;
  }

  else if (
    question.includes("ingreso") ||
    question.includes("venta")
  ) {
    response =
      `${company.name} tiene ` +
      `${money(income)} registrados en ingresos.`;
  }

  else if (
    question.includes("disponible") ||
    question.includes("saldo") ||
    question.includes("flujo") ||
    question.includes("resultado")
  ) {
    response =
      `El flujo registrado de ${company.name} es de ` +
      `${money(income - expense)}.`;
  }

  else {
    response =
      `${company.name} tiene ${money(income)} en ingresos ` +
      `y ${money(expense)} en gastos, dejando un flujo de ` +
      `${money(income - expense)}.`;
  }

  box.textContent = response;
  box.style.display = "block";
}


/* =========================================
   FECHAS
========================================= */

function today() {
  const now = new Date();

  const year = now.getFullYear();

  const month =
    String(now.getMonth() + 1).padStart(2, "0");

  const day =
    String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


function formatDate(date) {
  if (!date) return "";

  const parts = date.split("-");

  if (parts.length !== 3) {
    return date;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}


/* =========================================
   INICIAR OV
========================================= */

function initializeOV() {
  /*
    Si por alguna razón la empresa activa
    ya no existe, usamos la primera.
  */

  if (
    !companies.some(
      company => company.id === activeCompanyId
    )
  ) {
    activeCompanyId = companies[0].id;
  }


  companies.forEach(company => {
    if (!companyTransactions[company.id]) {
      companyTransactions[company.id] = [];
    }
  });


  const dateInput =
    document.getElementById("date");

  if (dateInput) {
    dateInput.value = today();
  }


  setupAmountInput();

  saveData();

  renderCompanySelector();

  updateMovementFormUI();

  updateCompanyUI();

  calculate();
}


initializeOV();

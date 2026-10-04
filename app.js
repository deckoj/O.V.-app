let transactionType = "income";
let editingTransactionId = null;

const OV_CONFIG = {
  defaultCurrency: "MXN",
  locale: "es-MX"
};


/* ==============================
   EMPRESAS
================================ */

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


/* ==============================
   MOVIMIENTOS / MIGRACIÓN
================================ */

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


/* ==============================
   EMPRESA ACTIVA
================================ */

function getActiveCompany() {
  return companies.find(
    company => company.id === activeCompanyId
  ) || companies[0];
}

function getCurrency() {
  return getActiveCompany()?.currency ||
    OV_CONFIG.defaultCurrency;
}

function getTransactions() {
  if (!companyTransactions[activeCompanyId]) {
    companyTransactions[activeCompanyId] = [];
  }

  return companyTransactions[activeCompanyId];
}


/* ==============================
   DINERO
================================ */

function money(number, currency = getCurrency()) {

  const value = Number(number) || 0;

  const formatted =
    new Intl.NumberFormat(
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


/* ==============================
   CAMPO MONTO
================================ */

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

  const input =
    document.getElementById("amount");

  if (!input) return 0;

  return Number(
    cleanAmount(input.value)
  ) || 0;
}


function formatAmountInput(value) {

  let clean =
    cleanAmount(value);

  if (!clean) return "";

  const firstDot =
    clean.indexOf(".");

  if (firstDot !== -1) {

    clean =
      clean.substring(0, firstDot + 1) +
      clean
        .substring(firstDot + 1)
        .replace(/\./g, "");
  }

  let [integerPart, decimalPart] =
    clean.split(".");

  integerPart =
    integerPart.replace(/^0+(?=\d)/, "");

  if (!integerPart) {
    integerPart = "0";
  }

  const formattedInteger =
    Number(integerPart)
      .toLocaleString("en-US");

  if (clean.includes(".")) {

    decimalPart =
      (decimalPart || "").slice(0, 2);

    return `${formattedInteger}.${decimalPart}`;
  }

  return formattedInteger;
}


function setupAmountInput() {

  const input =
    document.getElementById("amount");

  if (!input) return;

  input.type = "text";
  input.inputMode = "decimal";
  input.autocomplete = "off";

  input.addEventListener("input", () => {

    input.value =
      formatAmountInput(input.value);

    const end =
      input.value.length;

    try {
      input.setSelectionRange(end, end);
    } catch (error) {}
  });


  /* Al salir: $180,000.00 MXN */

  input.addEventListener("blur", () => {

    const value =
      getAmountValue();

    if (!value) {
      input.value = "";
      return;
    }

    input.value =
      money(value);
  });


  /* Al regresar: 180,000 */

  input.addEventListener("focus", () => {

    const value =
      getAmountValue();

    if (!value) {
      input.value = "";
      return;
    }

    let editable =
      value.toFixed(2);

    if (editable.endsWith(".00")) {
      editable =
        editable.slice(0, -3);
    }

    input.value =
      formatAmountInput(editable);

    setTimeout(() => {

      const end =
        input.value.length;

      try {
        input.setSelectionRange(end, end);
      } catch (error) {}

    }, 0);
  });
}


/* ==============================
   GUARDAR DATOS
================================ */

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


/* ==============================
   SELECTOR EMPRESA
================================ */

function renderCompanySelector() {

  const select =
    document.getElementById("companySelect");

  if (!select) return;

  select.innerHTML = "";

  companies.forEach(company => {

    const option =
      document.createElement("option");

    option.value =
      company.id;

    option.textContent =
      company.name;

    option.selected =
      company.id === activeCompanyId;

    select.appendChild(option);
  });
}


function changeCompany() {

  activeCompanyId =
    document.getElementById("companySelect").value;

  cancelEdit(false);

  saveData();
  updateCompanyUI();
  calculate();

  showToast("Empresa cambiada");
}


/* ==============================
   CREAR EMPRESA
================================ */

function createCompany() {

  const name =
    prompt("¿Cómo se llama la nueva empresa?");

  if (!name) return;

  const cleanName =
    name.trim();

  if (!cleanName) return;

  const alreadyExists =
    companies.some(
      company =>
        company.name.toLowerCase() ===
        cleanName.toLowerCase()
    );

  if (alreadyExists) {

    alert(
      "Ya existe una empresa con ese nombre."
    );

    return;
  }

  const id =
    "company-" + Date.now();

  companies.push({
    id,
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


/* ==============================
   ELIMINAR EMPRESA
================================ */

function deleteCompany(id) {

  if (companies.length === 1) {

    alert(
      "OV debe tener al menos una empresa."
    );

    return;
  }

  const company =
    companies.find(c => c.id === id);

  if (!company) return;

  const confirmed =
    confirm(
      `¿Eliminar "${company.name}"?\n\n` +
      `También se eliminarán sus movimientos guardados en este dispositivo.`
    );

  if (!confirmed) return;

  companies =
    companies.filter(c => c.id !== id);

  delete companyTransactions[id];

  if (activeCompanyId === id) {
    activeCompanyId =
      companies[0].id;
  }

  saveData();
  renderCompanySelector();
  updateCompanyUI();
  calculate();

  showToast("Empresa eliminada");
}


/* ==============================
   LISTA EMPRESAS
================================ */

function renderCompanyList() {

  const container =
    document.getElementById("companyList");

  if (!container) return;

  container.innerHTML = "";

  companies.forEach(company => {

    const transactions =
      companyTransactions[company.id] || [];

    const row =
      document.createElement("div");

    row.className =
      "companyRow";


    const left =
      document.createElement("div");

    const strong =
      document.createElement("strong");

    strong.textContent =
      company.name;

    const br =
      document.createElement("br");

    const small =
      document.createElement("small");

    small.textContent =
      `${transactions.length} movimiento` +
      `${transactions.length === 1 ? "" : "s"} · ` +
      `${company.currency || "MXN"}`;

    left.appendChild(strong);
    left.appendChild(br);
    left.appendChild(small);


    const right =
      document.createElement("div");

    if (company.id === activeCompanyId) {

      const current =
        document.createElement("small");

      current.textContent =
        "Actual";

      right.appendChild(current);

    } else {

      const button =
        document.createElement("button");

      button.className =
        "deleteButton";

      button.textContent =
        "Eliminar";

      button.onclick =
        () => deleteCompany(company.id);

      right.appendChild(button);
    }

    row.appendChild(left);
    row.appendChild(right);

    container.appendChild(row);
  });
}


/* ==============================
   UI EMPRESA
================================ */

function updateCompanyUI() {

  const company =
    getActiveCompany();

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
    `Analizando la información de ${company.name}.`
  );

  setText(
    "moreCompanyName",
    `${company.name} · ${getCurrency()}`
  );

  renderCompanyList();
}


/* ==============================
   CÁLCULOS
================================ */

function calculate() {

  const transactions =
    getTransactions();

  let income = 0;
  let expense = 0;

  transactions.forEach(transaction => {

    if (transaction.type === "income") {

      income +=
        Number(transaction.amount);

    } else {

      expense +=
        Number(transaction.amount);
    }
  });

  const balance =
    income - expense;

  setText(
    "income",
    money(income)
  );

  setText(
    "expense",
    money(expense)
  );

  setText(
    "balance",
    money(balance)
  );

  setText(
    "result",
    money(balance)
  );

  renderTransactions();
}


/* ==============================
   MOVIMIENTOS
================================ */

function renderTransactions() {

  const transactions =
    getTransactions();

  const sorted =
    [...transactions].sort(
      (a, b) => b.id - a.id
    );

  const recent =
    document.getElementById("recentTransactions");

  const all =
    document.getElementById("allTransactions");

  if (!recent || !all) return;

  recent.innerHTML = "";
  all.innerHTML = "";

  if (sorted.length === 0) {

    const empty =
      '<div class="empty">' +
      'Aún no hay movimientos en esta empresa.' +
      '</div>';

    recent.innerHTML = empty;
    all.innerHTML = empty;

    return;
  }

  sorted.forEach((transaction, index) => {

    const sign =
      transaction.type === "income"
        ? "+"
        : "-";

    const amountClass =
      transaction.type === "income"
        ? "amountIncome"
        : "amountExpense";


    /*
      El botón ⋯ abre las opciones
      Editar / Eliminar
    */

    const html = `
      <div class="transaction">

        <div style="flex:1;min-width:0">

          <strong>
            ${escapeHTML(transaction.concept)}
          </strong>

          <br>

          <small>
            ${escapeHTML(transaction.category)}
            ·
            ${formatDate(transaction.date)}
          </small>

        </div>


        <div style="
          display:flex;
          align-items:center;
          gap:8px;
        ">

          <div class="${amountClass}">
            ${sign}${money(transaction.amount)}
          </div>

          <button
            onclick="openTransactionMenu(${transaction.id})"
            aria-label="Opciones del movimiento"
            style="
              border:0;
              background:#eef1f4;
              width:34px;
              height:34px;
              border-radius:10px;
              font-size:20px;
              line-height:20px;
              color:#17212b;
              cursor:pointer;
            ">
            ⋯
          </button>

        </div>

      </div>
    `;

    all.innerHTML += html;

    if (index < 3) {
      recent.innerHTML += html;
    }
  });
}


/* ==============================
   MENÚ MOVIMIENTO
================================ */

function openTransactionMenu(id) {

  const transaction =
    getTransactions()
      .find(
        transaction =>
          transaction.id === id
      );

  if (!transaction) return;

  const choice =
    prompt(
      `${transaction.concept}\n` +
      `${money(transaction.amount)}\n\n` +
      `Escribe:\n` +
      `1 para EDITAR\n` +
      `2 para ELIMINAR\n` +
      `0 para CANCELAR`
    );

  if (choice === "1") {

    editTransaction(id);

  } else if (choice === "2") {

    deleteTransaction(id);
  }
}


/* ==============================
   EDITAR MOVIMIENTO
================================ */

function editTransaction(id) {

  const transaction =
    getTransactions()
      .find(
        transaction =>
          transaction.id === id
      );

  if (!transaction) return;

  editingTransactionId =
    id;

  setType(
    transaction.type
  );

  const amountInput =
    document.getElementById("amount");

  amountInput.value =
    money(transaction.amount);

  document
    .getElementById("concept")
    .value =
      transaction.concept || "";

  document
    .getElementById("category")
    .value =
      transaction.category || "Otros";

  document
    .getElementById("date")
    .value =
      transaction.date ||
      today();

  document
    .getElementById("notes")
    .value =
      transaction.notes || "";

  updateCompanyUI();

  updateSaveButton();

  showPage(
    "add",
    document.querySelectorAll(".navItem")[2]
  );

  showToast(
    "Editando movimiento"
  );
}


/* ==============================
   ELIMINAR MOVIMIENTO
================================ */

function deleteTransaction(id) {

  const transactions =
    getTransactions();

  const transaction =
    transactions.find(
      transaction =>
        transaction.id === id
    );

  if (!transaction) return;

  const confirmed =
    confirm(
      `¿Eliminar este movimiento?\n\n` +
      `${transaction.concept}\n` +
      `${money(transaction.amount)}\n\n` +
      `Esta acción no se puede deshacer.`
    );

  if (!confirmed) return;

  companyTransactions[activeCompanyId] =
    transactions.filter(
      transaction =>
        transaction.id !== id
    );

  if (editingTransactionId === id) {
    cancelEdit(false);
  }

  saveData();
  calculate();
  renderCompanyList();

  showToast(
    "Movimiento eliminado"
  );
}


/* ==============================
   CANCELAR EDICIÓN
================================ */

function cancelEdit(showMessage = true) {

  editingTransactionId =
    null;

  clearMovementForm();

  setType("income");

  updateSaveButton();

  updateCompanyUI();

  if (showMessage) {
    showToast("Edición cancelada");
  }
}


/* ==============================
   BOTÓN GUARDAR
================================ */

function updateSaveButton() {

  const button =
    document.querySelector(
      "#add .primary"
    );

  if (!button) return;

  if (editingTransactionId) {

    button.textContent =
      "Guardar cambios";

  } else {

    button.textContent =
      "Guardar movimiento";
  }


  /*
    Creamos automáticamente
    un botón Cancelar cuando
    estamos editando.
  */

  let cancelButton =
    document.getElementById(
      "cancelEditButton"
    );

  if (editingTransactionId) {

    if (!cancelButton) {

      cancelButton =
        document.createElement(
          "button"
        );

      cancelButton.id =
        "cancelEditButton";

      cancelButton.type =
        "button";

      cancelButton.className =
        "secondary";

      cancelButton.textContent =
        "Cancelar edición";

      cancelButton.style.marginTop =
        "10px";

      cancelButton.onclick =
        () => cancelEdit();

      button.insertAdjacentElement(
        "afterend",
        cancelButton
      );
    }

  } else {

    if (cancelButton) {
      cancelButton.remove();
    }
  }
}


/* ==============================
   LIMPIAR FORMULARIO
================================ */

function clearMovementForm() {

  const amount =
    document.getElementById("amount");

  const concept =
    document.getElementById("concept");

  const notes =
    document.getElementById("notes");

  const date =
    document.getElementById("date");

  if (amount) {
    amount.value = "";
  }

  if (concept) {
    concept.value = "";
  }

  if (notes) {
    notes.value = "";
  }

  if (date) {
    date.value = today();
  }
}


/* ==============================
   TIPO MOVIMIENTO
================================ */

function setType(type) {

  transactionType =
    type;

  const incomeButton =
    document.getElementById(
      "incomeBtn"
    );

  const expenseButton =
    document.getElementById(
      "expenseBtn"
    );

  if (incomeButton) {

    incomeButton.classList.toggle(
      "active",
      type === "income"
    );
  }

  if (expenseButton) {

    expenseButton.classList.toggle(
      "active",
      type === "expense"
    );
  }
}


/* ==============================
   GUARDAR / ACTUALIZAR
================================ */

function saveTransaction() {

  const amount =
    getAmountValue();

  const concept =
    document
      .getElementById("concept")
      .value
      .trim();

  const category =
    document
      .getElementById("category")
      .value;

  const date =
    document
      .getElementById("date")
      .value;

  const notes =
    document
      .getElementById("notes")
      .value
      .trim();


  if (!amount || amount <= 0) {

    alert(
      "Ingresa un monto válido."
    );

    return;
  }


  if (!concept) {

    alert(
      "Escribe el concepto del movimiento."
    );

    return;
  }


  const transactions =
    getTransactions();


  /*
    SI ESTAMOS EDITANDO
  */

  if (editingTransactionId) {

    const transaction =
      transactions.find(
        transaction =>
          transaction.id ===
          editingTransactionId
      );

    if (!transaction) {

      alert(
        "No se encontró el movimiento."
      );

      return;
    }

    transaction.type =
      transactionType;

    transaction.amount =
      amount;

    transaction.currency =
      getCurrency();

    transaction.concept =
      concept;

    transaction.category =
      category;

    transaction.date =
      date || today();

    transaction.notes =
      notes;

    transaction.updatedAt =
      Date.now();

    editingTransactionId =
      null;

    showToast(
      "Movimiento actualizado"
    );

  } else {

    /*
      MOVIMIENTO NUEVO
    */

    transactions.push({

      id: Date.now(),

      type:
        transactionType,

      amount,

      currency:
        getCurrency(),

      concept,

      category,

      client: "",

      project: "",

      source:
        "manual",

      classificationStatus:
        "manual",

      date:
        date || today(),

      notes,

      createdAt:
        Date.now()
    });

    showToast(
      "Movimiento guardado"
    );
  }


  companyTransactions[
    activeCompanyId
  ] = transactions;

  saveData();

  clearMovementForm();

  setType("income");

  updateSaveButton();

  updateCompanyUI();

  calculate();

  renderCompanyList();

  showPage(
    "home",
    document.querySelectorAll(
      ".navItem"
    )[0]
  );
}


/* ==============================
   NAVEGACIÓN
================================ */

function showPage(page, button) {

  document
    .querySelectorAll(".page")
    .forEach(
      element =>
        element
          .classList
          .remove("active")
    );

  const selectedPage =
    document.getElementById(page);

  if (selectedPage) {
    selectedPage
      .classList
      .add("active");
  }

  document
    .querySelectorAll(".navItem")
    .forEach(
      element =>
        element
          .classList
          .remove("active")
    );

  if (button) {
    button
      .classList
      .add("active");
  }

  if (page === "more") {
    renderCompanyList();
  }

  window.scrollTo(0, 0);
}


/* ==============================
   AVISOS
================================ */

function showToast(message) {

  const toast =
    document.getElementById(
      "toast"
    );

  if (!toast) return;

  toast.textContent =
    message || "Guardado";

  toast.style.display =
    "block";

  setTimeout(() => {

    toast.style.display =
      "none";

  }, 1800);
}


/* ==============================
   FINANCE
================================ */

function askOV() {

  const input =
    document.getElementById(
      "aiQuestion"
    );

  if (!input) return;

  const question =
    input.value
      .toLowerCase();

  const transactions =
    getTransactions();

  let income = 0;
  let expense = 0;

  transactions.forEach(
    transaction => {

      if (
        transaction.type ===
        "income"
      ) {

        income +=
          Number(
            transaction.amount
          );

      } else {

        expense +=
          Number(
            transaction.amount
          );
      }
    }
  );

  const company =
    getActiveCompany();

  let response;


  if (
    question.includes("gasto")
  ) {

    response =
      `${company.name} tiene ` +
      `${money(expense)} ` +
      `registrados en gastos.`;

  }

  else if (
    question.includes("ingreso") ||
    question.includes("venta")
  ) {

    response =
      `${company.name} tiene ` +
      `${money(income)} ` +
      `registrados en ingresos.`;

  }

  else if (
    question.includes("disponible") ||
    question.includes("saldo") ||
    question.includes("flujo")
  ) {

    response =
      `El flujo registrado de ` +
      `${company.name} es de ` +
      `${money(
        income - expense
      )}.`;

  }

  else {

    response =
      `${company.name} tiene ` +
      `${money(income)} en ingresos ` +
      `y ${money(expense)} en gastos, ` +
      `dejando un flujo de ` +
      `${money(
        income - expense
      )}.`;
  }

  const box =
    document.getElementById(
      "aiAnswer"
    );

  if (!box) return;

  box.innerText =
    response;

  box.style.display =
    "block";
}


/* ==============================
   FECHAS
================================ */

function today() {

  return new Date()
    .toISOString()
    .slice(0, 10);
}


function formatDate(date) {

  if (!date) return "";

  const parts =
    date.split("-");

  if (parts.length !== 3) {
    return date;
  }

  return (
    `${parts[2]}/` +
    `${parts[1]}/` +
    `${parts[0]}`
  );
}


/* ==============================
   UTILIDADES
================================ */

function escapeHTML(value) {

  const div =
    document.createElement("div");

  div.textContent =
    value ?? "";

  return div.innerHTML;
}


function setText(id, value) {

  const element =
    document.getElementById(id);

  if (element) {
    element.innerText =
      value;
  }
}


/* ==============================
   INICIAR OV
================================ */

function initializeOV() {

  const dateInput =
    document.getElementById(
      "date"
    );

  if (dateInput) {
    dateInput.value =
      today();
  }

  setupAmountInput();

  saveData();

  renderCompanySelector();

  updateCompanyUI();

  updateSaveButton();

  calculate();
}

initializeOV();

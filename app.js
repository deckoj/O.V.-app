let transactionType = "income";

/* ==============================
   OV — CONFIGURACIÓN
================================ */

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

  const clean =
    cleanAmount(input.value);

  return Number(clean) || 0;
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
      (decimalPart || "")
        .slice(0, 2);

    return (
      formattedInteger +
      "." +
      decimalPart
    );
  }

  return formattedInteger;
}


function setupAmountInput() {

  const input =
    document.getElementById("amount");

  if (!input) return;

  /*
    Necesitamos texto para poder mostrar:
    1,000
    y después:
    $1,000.00 MXN
  */

  input.type = "text";
  input.inputMode = "decimal";
  input.autocomplete = "off";


  /*
    MIENTRAS ESCRIBES

    1000
    se convierte inmediatamente en
    1,000
  */

  input.addEventListener(
    "input",
    function () {

      const formatted =
        formatAmountInput(input.value);

      input.value = formatted;

      const end =
        input.value.length;

      try {
        input.setSelectionRange(end, end);
      } catch (error) {
        // Algunos navegadores móviles pueden ignorarlo.
      }
    }
  );


  /*
    CUANDO SALES DEL CAMPO

    1,000
    se convierte en
    $1,000.00 MXN
  */

  input.addEventListener(
    "blur",
    function () {

      const value =
        getAmountValue();

      if (!value) {
        input.value = "";
        return;
      }

      input.value =
        money(value);
    }
  );


  /*
    CUANDO REGRESAS A EDITAR

    $1,000.00 MXN
    vuelve a
    1,000

    Si hay centavos reales:
    $1,000.50 MXN
    vuelve a
    1,000.50
  */

  input.addEventListener(
    "focus",
    function () {

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
        } catch (error) {
          // Sin acción necesaria.
        }

      }, 0);
    }
  );
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
   SELECTOR DE EMPRESA
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

    if (company.id === activeCompanyId) {
      option.selected = true;
    }

    select.appendChild(option);
  });
}


function changeCompany() {

  activeCompanyId =
    document.getElementById("companySelect").value;

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
    prompt(
      "¿Cómo se llama la nueva empresa?"
    );

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
    companies.find(
      company => company.id === id
    );

  if (!company) return;

  const confirmed =
    confirm(
      `¿Eliminar "${company.name}"?\n\n` +
      `También se eliminarán sus movimientos guardados en este dispositivo.`
    );

  if (!confirmed) return;

  companies =
    companies.filter(
      company => company.id !== id
    );

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
   LISTA DE EMPRESAS
================================ */

function renderCompanyList() {

  const container =
    document.getElementById(
      "companyList"
    );

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

    if (
      company.id ===
      activeCompanyId
    ) {

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
        () =>
          deleteCompany(company.id);

      right.appendChild(button);
    }

    row.appendChild(left);
    row.appendChild(right);

    container.appendChild(row);
  });
}


/* ==============================
   INTERFAZ EMPRESA
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
    `Registrando movimiento en ${company.name} · ${getCurrency()}.`
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
    [...transactions]
      .sort(
        (a, b) =>
          b.id - a.id
      );

  const recent =
    document.getElementById(
      "recentTransactions"
    );

  const all =
    document.getElementById(
      "allTransactions"
    );

  if (!recent || !all) return;

  recent.innerHTML = "";
  all.innerHTML = "";

  if (sorted.length === 0) {

    const empty =
      '<div class="empty">' +
      'Aún no hay movimientos en esta empresa.' +
      '</div>';

    recent.innerHTML =
      empty;

    all.innerHTML =
      empty;

    return;
  }

  sorted.forEach(
    (transaction, index) => {

      const sign =
        transaction.type ===
        "income"
          ? "+"
          : "-";

      const amountClass =
        transaction.type ===
        "income"
          ? "amountIncome"
          : "amountExpense";

      const html = `
        <div class="transaction">

          <div>

            <strong>
              ${escapeHTML(
                transaction.concept
              )}
            </strong>

            <br>

            <small>
              ${escapeHTML(
                transaction.category
              )}
              ·
              ${formatDate(
                transaction.date
              )}
            </small>

          </div>

          <div class="${amountClass}">
            ${sign}${money(
              transaction.amount
            )}
          </div>

        </div>
      `;

      all.innerHTML +=
        html;

      if (index < 3) {
        recent.innerHTML +=
          html;
      }
    }
  );
}


/* ==============================
   TIPO DE MOVIMIENTO
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
   GUARDAR MOVIMIENTO
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

  if (
    !amount ||
    amount <= 0
  ) {

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

  transactions.push({

    id: Date.now(),

    type:
      transactionType,

    amount,

    currency:
      getCurrency(),

    concept,

    category,

    /*
      Estos campos preparan OV
      para Finance.
    */

    client: "",

    project: "",

    source:
      "manual",

    classificationStatus:
      "manual",

    date:
      date ||
      new Date()
        .toISOString()
        .slice(0, 10),

    notes
  });

  companyTransactions[
    activeCompanyId
  ] = transactions;

  saveData();
  calculate();
  renderCompanyList();

  document
    .getElementById("amount")
    .value = "";

  document
    .getElementById("concept")
    .value = "";

  document
    .getElementById("notes")
    .value = "";

  showToast(
    "Movimiento guardado"
  );

  showPage(
    "home",
    document
      .querySelectorAll(
        ".navItem"
      )[0]
  );
}


/* ==============================
   NAVEGACIÓN
================================ */

function showPage(
  page,
  button
) {

  document
    .querySelectorAll(".page")
    .forEach(
      element =>
        element
          .classList
          .remove("active")
    );

  const selectedPage =
    document
      .getElementById(page);

  if (selectedPage) {

    selectedPage
      .classList
      .add("active");
  }

  document
    .querySelectorAll(
      ".navItem"
    )
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

  window.scrollTo(
    0,
    0
  );
}


/* ==============================
   AVISOS
================================ */

function showToast(message) {

  const toast =
    document
      .getElementById(
        "toast"
      );

  if (!toast) return;

  toast.textContent =
    message ||
    "Guardado";

  toast.style.display =
    "block";

  setTimeout(
    () => {

      toast.style.display =
        "none";

    },
    1800
  );
}


/* ==============================
   FINANCE — PROTOTIPO LOCAL
================================ */

function askOV() {

  const input =
    document
      .getElementById(
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
    question.includes(
      "gasto"
    )
  ) {

    response =
      `${company.name} tiene ` +
      `${money(expense)} ` +
      `registrados en gastos.`;

  } else if (
    question.includes(
      "ingreso"
    ) ||
    question.includes(
      "venta"
    )
  ) {

    response =
      `${company.name} tiene ` +
      `${money(income)} ` +
      `registrados en ingresos.`;

  } else if (
    question.includes(
      "disponible"
    ) ||
    question.includes(
      "saldo"
    ) ||
    question.includes(
      "flujo"
    )
  ) {

    response =
      `El flujo registrado de ` +
      `${company.name} es de ` +
      `${money(
        income - expense
      )}.`;

  } else {

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
    document
      .getElementById(
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

function formatDate(date) {

  if (!date) return "";

  const parts =
    date.split("-");

  if (
    parts.length !== 3
  ) {
    return date;
  }

  return (
    `${parts[2]}/` +
    `${parts[1]}/` +
    `${parts[0]}`
  );
}


/* ==============================
   SEGURIDAD / UTILIDADES
================================ */

function escapeHTML(value) {

  const div =
    document
      .createElement("div");

  div.textContent =
    value ?? "";

  return div.innerHTML;
}


function setText(
  id,
  value
) {

  const element =
    document
      .getElementById(id);

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
    document
      .getElementById(
        "date"
      );

  if (dateInput) {

    dateInput.value =
      new Date()
        .toISOString()
        .slice(0, 10);
  }

  setupAmountInput();

  saveData();

  renderCompanySelector();

  updateCompanyUI();

  calculate();
}

initializeOV();

/* ========= DOM ========= */

const input = document.getElementById("pdfInput");
const startInput = document.getElementById("startPage");
const endInput = document.getElementById("endPage");
const info = document.getElementById("pageInfo");
const status = document.getElementById("statusMessage");
const fileNameInput = document.getElementById("fileName");
const splitBtn = document.getElementById("splitBtn");

const startCanvas = document.getElementById("startPreview");
const endCanvas = document.getElementById("endPreview");

/* ========= ESTADO ========= */

let totalPages = null;
let pdfJsDoc = null;
let pdfLibDoc = null;

/* ========= PDF.JS WORKER ========= */

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/legacy/build/pdf.worker.min.js";

/* ========= UTILIDADES ========= */

function setError(msg) {
  status.textContent = msg || "";
}

function clearError() {
  status.textContent = "";
}

function getOutputFileName() {
  const userName = fileNameInput.value.trim();

  const start = parseInt(startInput.value);
  const end = parseInt(endInput.value);

  // Si el usuario escribió algo, se usa directamente
  if (userName) return userName + ".pdf";

  // Si no, generamos dinámicamente
  return `${start}-${end}_${originalPdfName}.pdf`;
}


let originalPdfName = ""; 

input.addEventListener("change", async () => {
  const file = input.files[0];
  if (!file) return;

  originalPdfName = file.name.replace(/\.pdf$/i, ""); // Guardar sin extensión

  clearError();

  const bytes = await file.arrayBuffer();

  pdfLibDoc = await PDFLib.PDFDocument.load(bytes);
  pdfJsDoc = await pdfjsLib.getDocument({ data: bytes }).promise;

  totalPages = pdfLibDoc.getPageCount();
  startInput.value = 1;
  endInput.value = totalPages;

  updatePageInfo();
  updatePreviews();
});

/* ========= INFO / VALIDACIÓN ========= */

function updatePageInfo() {
  if (!totalPages) {
    info.textContent = "";
    clearError();
    return;
  }

  const s = parseInt(startInput.value);
  const e = parseInt(endInput.value);

  if (!s || !e) {
    info.textContent = `PDF cargado: ${totalPages} páginas`;
    clearError();
    return;
  }

  if (s < 1 || e > totalPages || s > e) {
    info.textContent = "";
    setError(`Rango inválido. Debe ser entre 1 y ${totalPages}`);
    return;
  }

  clearError();
  info.textContent = `Rango seleccionado: ${s}–${e} de ${totalPages}`;
}

/* ========= PREVIEW ========= */

async function renderPage(pageNum, canvas) {
  if (!pdfJsDoc) return;

  if (pageNum < 1 || pageNum > pdfJsDoc.numPages) {
    setError("Página fuera de rango");
    return;
  }

  const page = await pdfJsDoc.getPage(pageNum);
  const baseViewport = page.getViewport({ scale: 1 });

  const MAX_WIDTH = 400;
  const scale = Math.min(MAX_WIDTH / baseViewport.width, 1);
  const viewport = page.getViewport({ scale });

  const ctx = canvas.getContext("2d");
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({ canvasContext: ctx, viewport }).promise;
}

function updatePreviews() {
  const s = parseInt(startInput.value);
  const e = parseInt(endInput.value);

  if (s) renderPage(s, startCanvas);
  if (e) renderPage(e, endCanvas);
}

/* ========= SPLIT ========= */

async function splitPdf(start, end) {
  const newPdf = await PDFLib.PDFDocument.create();
  const pages = await newPdf.copyPages(
    pdfLibDoc,
    Array.from({ length: end - start + 1 }, (_, i) => start - 1 + i)
  );
  pages.forEach(p => newPdf.addPage(p));
  return newPdf.save();
}

function download(bytes, name) {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
}

/* ========= EVENTOS ========= */

input.addEventListener("change", async () => {
  const file = input.files[0];
  if (!file) return;

  clearError();

  const bytes = await file.arrayBuffer();

  pdfLibDoc = await PDFLib.PDFDocument.load(bytes);
  pdfJsDoc = await pdfjsLib.getDocument({ data: bytes }).promise;

  totalPages = pdfLibDoc.getPageCount();
  startInput.value = 1;
  endInput.value = totalPages;

  updatePageInfo();
  updatePreviews();
});

[startInput, endInput].forEach(el =>
  el.addEventListener("input", () => {
    updatePageInfo();
    updatePreviews();
  })
);

splitBtn.onclick = async () => {
  const s = parseInt(startInput.value);
  const e = parseInt(endInput.value);

  if (!pdfLibDoc) {
    setError("No hay PDF cargado");
    return;
  }

  if (!s || !e || s < 1 || e > totalPages || s > e) {
    setError("No se puede dividir: rango inválido");
    return;
  }

  clearError();

  const bytes = await splitPdf(s, e);
  download(bytes, getOutputFileName());
};

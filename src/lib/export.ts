// Exportación a Excel sin dependencias: genera un archivo .xls (tabla HTML que
// Excel/LibreOffice abren de forma nativa, conservando columnas y encabezados).

function escapeHtml(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function exportToExcel(
  filename: string,
  columns: string[],
  rows: (string | number)[][]
): void {
  const head = columns.map((c) => `<th style="background:#0B1E3F;color:#fff;padding:6px;text-align:left">${escapeHtml(c)}</th>`).join("");
  const body = rows
    .map(
      (r) =>
        `<tr>${r
          .map((cell) => `<td style="padding:6px;border:1px solid #ccc">${escapeHtml(cell)}</td>`)
          .join("")}</tr>`
    )
    .join("");
  const html =
    `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">` +
    `<head><meta charset="UTF-8"></head><body>` +
    `<table>${`<thead><tr>${head}</tr></thead>`}<tbody>${body}</tbody></table>` +
    `</body></html>`;

  const blob = new Blob(["﻿", html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".xls") ? filename : `${filename}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

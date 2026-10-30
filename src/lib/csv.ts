/** Builds a CSV string. Cells starting with = + - @ are prefixed with ' so
 * spreadsheet apps don't execute them as formulas (CSV injection). */
export function toCSV(rows: (string | number)[][]): string {
  return rows
    .map((r) =>
      r
        .map((v) => {
          let s = String(v ?? "");
          if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
          return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    )
    .join("\r\n");
}

export const rupees = (paise: number) => (paise / 100).toFixed(2);

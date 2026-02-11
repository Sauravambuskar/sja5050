import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export type BulkUserRow = {
  email: string;
  full_name: string;
  phone?: string;
  dob?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  bank_name?: string;
  bank_account_holder_name?: string;
  bank_account_number?: string;
  bank_ifsc_code?: string;
  nominee_name?: string;
  nominee_relationship?: string;
  nominee_dob?: string;
};

const TEMPLATE_HEADERS: (keyof BulkUserRow)[] = [
  "email",
  "full_name",
  "phone",
  "dob",
  "address",
  "city",
  "state",
  "pincode",
  "bank_name",
  "bank_account_holder_name",
  "bank_account_number",
  "bank_ifsc_code",
  "nominee_name",
  "nominee_relationship",
  "nominee_dob",
];

function downloadTemplate() {
  const notes = [
    {
      field: "email",
      required: "YES",
      format: "user@example.com",
      notes: "Must be unique. Used as login.",
    },
    {
      field: "full_name",
      required: "YES",
      format: "John Doe",
      notes: "Minimum 2 characters.",
    },
    {
      field: "dob",
      required: "NO",
      format: "YYYY-MM-DD",
      notes: "Use exact format. Example: 1990-05-28",
    },
    {
      field: "nominee_dob",
      required: "NO",
      format: "YYYY-MM-DD",
      notes: "Use exact format. Example: 2000-01-15",
    },
    {
      field: "phone",
      required: "NO",
      format: "+91XXXXXXXXXX",
      notes: "Any string is accepted; keep consistent formatting.",
    },
  ];

  const wsUsers = XLSX.utils.aoa_to_sheet([
    TEMPLATE_HEADERS,
    [
      "demo.user1@example.com",
      "Demo User 1",
      "+919999999999",
      "1990-05-28",
      "221B Baker Street",
      "Mumbai",
      "Maharashtra",
      "400001",
      "SBI",
      "Demo User 1",
      "1234567890",
      "SBIN0000001",
      "Nominee Name",
      "Spouse",
      "2000-01-15",
    ],
  ]);

  const wsNotes = XLSX.utils.json_to_sheet(notes);

  // Make header row bold-ish by setting column widths only (simple, no styling)
  wsUsers["!cols"] = TEMPLATE_HEADERS.map((h) => ({ wch: Math.max(String(h).length + 2, 18) }));
  wsNotes["!cols"] = [
    { wch: 18 },
    { wch: 10 },
    { wch: 18 },
    { wch: 60 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsUsers, "users");
  XLSX.utils.book_append_sheet(wb, wsNotes, "instructions");

  XLSX.writeFile(wb, "bulk_users_template.xlsx");
}

function normHeader(s: unknown) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function pickString(v: unknown) {
  const s = String(v ?? "").trim();
  return s || "";
}

function toYYYYMMDD(value: unknown): string {
  // If excel date becomes number, xlsx usually gives a number. We'll attempt conversion.
  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value);
    if (!date) return "";
    const mm = String(date.m).padStart(2, "0");
    const dd = String(date.d).padStart(2, "0");
    const yyyy = String(date.y).padStart(4, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  const s = String(value ?? "").trim();
  if (!s) return "";
  // already ok
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return "";
}

async function extractEdgeFunctionErrorMessage(err: any) {
  const fallback = err?.message || "Request failed";
  const res = err?.context?.response;
  if (!res) return fallback;

  try {
    const body = await res.clone().json();
    return body?.error || body?.message || fallback;
  } catch {
    return fallback;
  }
}

interface BulkUploadUsersDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted?: () => void;
}

export function BulkUploadUsersDialog({ isOpen, onOpenChange, onCompleted }: BulkUploadUsersDialogProps) {
  const [mode, setMode] = useState<"instant" | "invite">("instant");
  const [sendWelcomeEmail, setSendWelcomeEmail] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<BulkUserRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [resultSummary, setResultSummary] = useState<{ created: number; skipped: number; failed: number } | null>(null);
  const [resultRows, setResultRows] = useState<any[] | null>(null);

  const previewRows = useMemo(() => rows.slice(0, 8), [rows]);

  const reset = () => {
    setFile(null);
    setRows([]);
    setIsParsing(false);
    setIsUploading(false);
    setResultSummary(null);
    setResultRows(null);
    setMode("instant");
    setSendWelcomeEmail(false);
  };

  const handleClose = (open: boolean) => {
    onOpenChange(open);
    if (!open) reset();
  };

  const parseFile = async (f: File) => {
    setIsParsing(true);
    setResultSummary(null);
    setResultRows(null);

    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheetName = wb.SheetNames.includes("users") ? "users" : wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });

      // Normalize keys
      const normalized = data
        .map((obj) => {
          const out: Record<string, any> = {};
          Object.entries(obj).forEach(([k, v]) => {
            out[normHeader(k)] = v;
          });
          return out;
        })
        .filter((r) => {
          const email = pickString(r.email).trim();
          const name = pickString(r.full_name).trim();
          return email || name; // ignore fully empty rows
        })
        .map((r) => {
          const row: BulkUserRow = {
            email: pickString(r.email).trim(),
            full_name: pickString(r.full_name).trim(),
            phone: pickString(r.phone).trim() || undefined,
            dob: toYYYYMMDD(r.dob) || undefined,
            address: pickString(r.address).trim() || undefined,
            city: pickString(r.city).trim() || undefined,
            state: pickString(r.state).trim() || undefined,
            pincode: pickString(r.pincode).trim() || undefined,
            bank_name: pickString(r.bank_name).trim() || undefined,
            bank_account_holder_name: pickString(r.bank_account_holder_name).trim() || undefined,
            bank_account_number: pickString(r.bank_account_number).trim() || undefined,
            bank_ifsc_code: pickString(r.bank_ifsc_code).trim() || undefined,
            nominee_name: pickString(r.nominee_name).trim() || undefined,
            nominee_relationship: pickString(r.nominee_relationship).trim() || undefined,
            nominee_dob: toYYYYMMDD(r.nominee_dob) || undefined,
          };
          return row;
        });

      if (!normalized.length) {
        toast.error("No rows found in the file.");
        setRows([]);
        return;
      }

      if (normalized.length > 500) {
        toast.error("Too many rows. Maximum 500 users per upload.");
        setRows([]);
        return;
      }

      // Quick local validation
      const bad = normalized.find((r) => !r.email || !r.full_name);
      if (bad) {
        toast.error("Some rows are missing required fields (email, full_name). Please fix and re-upload.");
      }

      setRows(normalized);
    } catch (e: any) {
      toast.error(`Failed to parse file: ${e?.message || "Unknown error"}`);
      setRows([]);
    } finally {
      setIsParsing(false);
    }
  };

  const handleSelectFile = async (f: File | null) => {
    setFile(f);
    setRows([]);
    setResultSummary(null);
    setResultRows(null);
    if (f) await parseFile(f);
  };

  const downloadResults = () => {
    if (!resultRows?.length) {
      toast.error("No results to download.");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(resultRows);
    ws["!cols"] = Object.keys(resultRows[0] || {}).map((k) => ({ wch: Math.max(String(k).length + 2, 18) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "results");
    XLSX.writeFile(wb, `bulk_upload_results_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleUpload = async () => {
    if (!rows.length) {
      toast.error("Please select a file with at least 1 row.");
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading(`Uploading ${rows.length} users...`);

    try {
      const { data, error } = await supabase.functions.invoke("admin-bulk-create-users", {
        body: { rows, mode, sendWelcomeEmail },
      });

      if (error) {
        const msg = await extractEdgeFunctionErrorMessage(error);
        throw new Error(msg);
      }
      if ((data as any)?.error) throw new Error((data as any).error);

      setResultSummary((data as any)?.summary ?? null);
      setResultRows((data as any)?.results ?? null);

      toast.success("Bulk upload finished.", { id: toastId });
      onCompleted?.();
    } catch (e: any) {
      toast.error(e?.message || "Bulk upload failed.", { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Bulk Upload Users</DialogTitle>
          <DialogDescription>
            Download the Excel template, fill it, then upload to create many users at once.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="outline" onClick={downloadTemplate}>
              Download Excel Template
            </Button>

            <div className="flex items-center gap-3">
              <div className="grid gap-1">
                <div className="text-sm font-medium">Mode</div>
                <div className="text-xs text-muted-foreground">
                  Instant will auto-generate passwords. Invite will email a password setup link.
                </div>
              </div>
              <RadioGroup
                className="flex items-center gap-3"
                value={mode}
                onValueChange={(v) => setMode(v === "invite" ? "invite" : "instant")}
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem id="bulk_mode_instant" value="instant" />
                  <Label htmlFor="bulk_mode_instant">Instant</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem id="bulk_mode_invite" value="invite" />
                  <Label htmlFor="bulk_mode_invite">Invite</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div className="grid gap-1">
              <div className="text-sm font-medium">Send welcome email</div>
              <div className="text-xs text-muted-foreground">Optional best-effort email after creation.</div>
            </div>
            <Switch checked={sendWelcomeEmail} onCheckedChange={setSendWelcomeEmail} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="bulk_users_file">Upload filled Excel file</Label>
            <Input
              id="bulk_users_file"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => handleSelectFile(e.target.files?.[0] || null)}
            />
            {file && (
              <div className="text-xs text-muted-foreground">
                Selected: <span className="font-medium">{file.name}</span>
              </div>
            )}
          </div>

          {!!rows.length && (
            <div className="rounded-md border">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="grid gap-0.5">
                  <div className="text-sm font-medium">Preview</div>
                  <div className="text-xs text-muted-foreground">Showing first {previewRows.length} of {rows.length} rows</div>
                </div>
                <Button type="button" onClick={handleUpload} disabled={isParsing || isUploading}>
                  {isUploading ? "Uploading..." : `Upload (${rows.length})`}
                </Button>
              </div>
              <Separator />
              <ScrollArea className="h-60">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Full name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>DOB</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.map((r, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="max-w-[260px] truncate">{r.email}</TableCell>
                        <TableCell className="max-w-[260px] truncate">{r.full_name}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{r.phone || "—"}</TableCell>
                        <TableCell className="font-mono">{r.dob || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}

          {resultSummary && (
            <div className="rounded-md border p-4">
              <div className="text-sm font-medium">Result</div>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div className="rounded-md bg-muted px-3 py-2 text-sm">
                  Created: <span className="font-medium">{resultSummary.created}</span>
                </div>
                <div className="rounded-md bg-muted px-3 py-2 text-sm">
                  Skipped: <span className="font-medium">{resultSummary.skipped}</span>
                </div>
                <div className="rounded-md bg-muted px-3 py-2 text-sm">
                  Failed: <span className="font-medium">{resultSummary.failed}</span>
                </div>
              </div>

              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Button type="button" variant="outline" onClick={downloadResults}>
                  Download results (Excel)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setResultSummary(null);
                    setResultRows(null);
                  }}
                >
                  Clear results
                </Button>
              </div>

              {resultRows?.length ? (
                <div className="mt-3 text-xs text-muted-foreground">
                  Tip: Instant mode returns generated passwords in the results file.
                </div>
              ) : null}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleClose(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

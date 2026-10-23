"use client";

import { useEffect, useState, useRef } from "react";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Download,
  Edit2,
  Check,
  RefreshCw,
  Search,
  Lock,
  ShieldCheck,
  Sparkles,
  FileSpreadsheet,
  X,
} from "lucide-react";

export default function DocumentCenterPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadMessage, setUploadMessage] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Field editing state
  const [editingDoc, setEditingDoc] = useState<any>(null);
  const [editingField, setEditingField] = useState<any>(null);
  const [correctedValue, setCorrectedValue] = useState("");
  const [savingField, setSavingField] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await fetch("/api/documents");
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadMessage(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append(
      "documentType",
      file.name.toLowerCase().includes("po") ? "PURCHASE_ORDER" : "TAX_INVOICE"
    );

    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      setUploadMessage(data);
      fetchDocuments();
    } catch (err: any) {
      setUploadMessage({ error: err.message });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSimulateSampleUpload = async (
    docType: string,
    filename: string,
    isDuplicateTest = false
  ) => {
    setUploading(true);
    setUploadMessage(null);
    try {
      const rawText = isDuplicateTest
        ? "Apex_May_Invoice_101_Exact_Binary_Payload"
        : `${filename}_sample_${Date.now()}`;

      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename,
          documentType: docType,
          rawText,
        }),
      });
      const data = await res.json();
      setUploadMessage(data);
      fetchDocuments();
    } catch (e: any) {
      setUploadMessage({ error: e.message });
    } finally {
      setUploading(false);
    }
  };

  const handleSaveFieldCorrection = async () => {
    if (!editingDoc || !editingField) return;
    setSavingField(true);
    try {
      const res = await fetch(`/api/documents/${editingDoc.id}/fields`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fieldId: editingField.id,
          correctedValue,
        }),
      });
      if (res.ok) {
        setEditingDoc(null);
        setEditingField(null);
        fetchDocuments();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingField(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          Document Vault & Ingestion Pipeline
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Multi-format OCR parsing, cryptographic SHA-256 deduplication, and field verification
        </p>
      </div>

      {/* Upload Zone & Quick Sample Loaders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Drop Zone */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-7 border-2 border-dashed border-slate-300 hover:border-blue-500 transition-all shadow-subtle flex flex-col items-center justify-center text-center group">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept=".pdf,.csv,.xlsx,.json,.png,.jpg,.jpeg,.tsv,.txt"
          />

          <div className="h-14 w-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-brand shadow-blue-500/15">
            <UploadCloud className="h-7 w-7" />
          </div>

          <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">
            Ingest Procurement & Billing Documents
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md leading-relaxed">
            Upload Tax Invoices, Purchase Orders, Delivery Challans, Goods Receipts, or Bank Settlement CSVs (up to 25 MB).
          </p>

          <div className="mt-3 flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
            <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">PDF</span>
            <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">XLSX</span>
            <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">CSV</span>
            <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">TSV</span>
          </div>

          <div className="mt-5 flex flex-wrap gap-2.5 justify-center">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold shadow-brand transition-all cursor-pointer"
            >
              {uploading ? (
                <div className="flex items-center gap-2">
                  <div className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>Processing Stream...</span>
                </div>
              ) : (
                "Select File from Device"
              )}
            </button>

            <button
              onClick={() =>
                handleSimulateSampleUpload("TAX_INVOICE", "Sample_Invoice_INV-101.pdf")
              }
              disabled={uploading}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Ingest Sample Invoice
            </button>

            <button
              onClick={() =>
                handleSimulateSampleUpload(
                  "TAX_INVOICE",
                  "Sample_Invoice_INV-101_ReUpload.pdf",
                  true
                )
              }
              disabled={uploading}
              className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition-colors cursor-pointer"
            >
              Test Duplicate SHA-256 Hash
            </button>
          </div>
        </div>

        {/* Extraction Safeguards & Trust Badges */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-subtle space-y-3.5 text-xs">
          <h3 className="font-mono font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-blue-600" />
            <span>Integrity Safeguards</span>
          </h3>

          <div className="space-y-2.5 text-slate-600">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <strong className="text-slate-900 block font-bold mb-0.5">
                Cryptographic SHA-256 Fingerprint
              </strong>
              <p className="text-[11px] text-slate-500 leading-normal">
                Prevents double billing by instantly blocking identical file payloads across the organization.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <strong className="text-slate-900 block font-bold mb-0.5">
                Audit Trail Field Verification
              </strong>
              <p className="text-[11px] text-slate-500 leading-normal">
                Review OCR extracted tax rates, unit costs, and item codes with full manual override logging.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <strong className="text-slate-900 block font-bold mb-0.5">
                Zero Synthetic Drift
              </strong>
              <p className="text-[11px] text-slate-500 leading-normal">
                Never fabricates or hallucinates missing values. Discrepancies are flagged for human review.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Notification Bar */}
      {uploadMessage && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between text-xs shadow-subtle animate-fadeIn ${
            uploadMessage.error
              ? "bg-rose-50 text-rose-900 border-rose-200"
              : uploadMessage.isDuplicate
              ? "bg-amber-50 text-amber-900 border-amber-200"
              : "bg-emerald-50 text-emerald-900 border-emerald-200"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {uploadMessage.error || uploadMessage.isDuplicate ? (
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            )}
            <span className="font-medium">
              {uploadMessage.error
                ? uploadMessage.error
                : uploadMessage.isDuplicate
                ? uploadMessage.warning
                : `Document "${uploadMessage.document?.filename}" ingested and parsed with ${Math.round(
                    uploadMessage.document?.confidenceScore * 100
                  )}% confidence.`}
            </span>
          </div>
          <button
            onClick={() => setUploadMessage(null)}
            className="text-[11px] font-bold underline opacity-80 hover:opacity-100 cursor-pointer ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Ingested Documents Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-subtle overflow-hidden">
        <div className="px-6 py-4.5 border-b border-slate-200/90 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">
              Ingested Document Vault
            </h2>
            <p className="text-xs text-slate-500">
              Tamper-evident record storage and field extraction registry
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
            {documents.length} files stored
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-mono font-semibold uppercase text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-6">File Name</th>
                <th className="py-3.5 px-4">Document Type</th>
                <th className="py-3.5 px-4">SHA-256 Checksum</th>
                <th className="py-3.5 px-4">Confidence</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Loading document archive...
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No documents uploaded yet. Use the upload zone above to ingest files.
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-6 font-semibold text-slate-900 flex items-center gap-2.5">
                      <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                      <span className="truncate max-w-xs">{doc.filename}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold border border-slate-200">
                        {doc.documentType}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[10px] text-slate-400">
                      {doc.fileHashSha256.substring(0, 16)}...
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[11px]">
                        <Check className="h-3 w-3" />
                        {Math.round(doc.confidenceScore * 100)}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          doc.status === "DUPLICATE_FLAGGED"
                            ? "bg-amber-100 text-amber-800 border-amber-300"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}
                      >
                        {doc.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-right space-x-2">
                      {doc.extractedFields && doc.extractedFields.length > 0 && (
                        <button
                          onClick={() => {
                            setEditingDoc(doc);
                            setEditingField(doc.extractedFields[0]);
                            setCorrectedValue(
                              doc.extractedFields[0].correctedValue ||
                                doc.extractedFields[0].fieldValue
                            );
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 transition-colors"
                        >
                          <Edit2 className="h-3 w-3" /> Verify Fields
                        </button>
                      )}
                      <a
                        href={`/api/documents/${doc.id}/download`}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 hover:text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors"
                      >
                        <Download className="h-3 w-3" /> Download
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Field Correction Modal */}
      {editingDoc && editingField && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-blue-600" />
                Audit Extracted Field
              </h3>
              <button
                onClick={() => {
                  setEditingDoc(null);
                  setEditingField(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-500 text-[11px] mb-1 font-mono">
                  Document Reference:
                </label>
                <div className="font-bold text-slate-800 bg-slate-50 p-2 rounded-lg border border-slate-200">
                  {editingDoc.filename}
                </div>
              </div>

              <div>
                <label className="block text-slate-500 text-[11px] mb-1 font-mono">
                  Select Field to Correct:
                </label>
                <select
                  value={editingField.id}
                  onChange={(e) => {
                    const f = editingDoc.extractedFields.find(
                      (fld: any) => fld.id === e.target.value
                    );
                    if (f) {
                      setEditingField(f);
                      setCorrectedValue(f.correctedValue || f.fieldValue);
                    }
                  }}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white font-mono focus:ring-2 focus:ring-blue-500"
                >
                  {editingDoc.extractedFields.map((f: any) => (
                    <option key={f.id} value={f.id}>
                      {f.fieldName}: {f.correctedValue || f.fieldValue}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Verified / Corrected Value:
                </label>
                <input
                  type="text"
                  value={correctedValue}
                  onChange={(e) => setCorrectedValue(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setEditingDoc(null);
                    setEditingField(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveFieldCorrection}
                  disabled={savingField}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-brand transition-all cursor-pointer"
                >
                  {savingField ? "Saving..." : "Save Correction"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

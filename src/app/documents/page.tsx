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
    formData.append("documentType", file.name.toLowerCase().includes("po") ? "PURCHASE_ORDER" : "TAX_INVOICE");

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

  const handleSimulateSampleUpload = async (docType: string, filename: string, isDuplicateTest = false) => {
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
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Document Ingestion Center</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Intelligent OCR extraction, cryptographic hash deduplication, and field verification
        </p>
      </div>

      {/* Upload Zone & Quick Sample Loaders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Zone */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 border-2 border-dashed border-slate-300 hover:border-blue-500 transition-colors shadow-sm flex flex-col items-center justify-center text-center">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept=".pdf,.csv,.xlsx,.json,.png,.jpg,.jpeg,.tsv,.txt"
          />

          <div className="p-3 bg-blue-50 text-blue-600 rounded-full mb-3">
            <UploadCloud className="h-8 w-8" />
          </div>
          <h2 className="text-sm font-bold text-slate-900">Upload business documents here</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Accepts Tax Invoices, Purchase Orders, Goods Receipts, Credit Notes, and CSV/XLSX settlement files (up to 25 MB).
          </p>

          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm cursor-pointer"
            >
              {uploading ? "Processing..." : "Select File from Device"}
            </button>
            <button
              onClick={() => handleSimulateSampleUpload("TAX_INVOICE", "Sample_Invoice_INV-101.pdf")}
              disabled={uploading}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold shadow-sm cursor-pointer"
            >
              Load Sample Invoice
            </button>
            <button
              onClick={() => handleSimulateSampleUpload("TAX_INVOICE", "Sample_Invoice_INV-101_ReUpload.pdf", true)}
              disabled={uploading}
              className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-semibold shadow-sm cursor-pointer"
            >
              Test Duplicate Hash
            </button>
          </div>
        </div>

        {/* Extraction Safeguards */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-3 text-xs">
          <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
            Ingestion Controls & Integrity
          </h3>
          <div className="space-y-2 text-slate-600">
            <div className="p-2 rounded bg-slate-50 border border-slate-200">
              <strong className="text-slate-800 block">Cryptographic SHA-256:</strong>
              Blocks duplicate documents uploaded under altered filenames.
            </div>
            <div className="p-2 rounded bg-slate-50 border border-slate-200">
              <strong className="text-slate-800 block">Field-Level Verification:</strong>
              Inspect and correct extracted values; changes are stored in tamper-evident logs.
            </div>
            <div className="p-2 rounded bg-slate-50 border border-slate-200">
              <strong className="text-slate-800 block">Zero Silent Hallucinations:</strong>
              Never invents missing taxes or quantities without explicit document evidence.
            </div>
          </div>
        </div>
      </div>

      {/* Upload Notification Bar */}
      {uploadMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs ${
            uploadMessage.error
              ? "bg-red-50 text-red-900 border-red-300"
              : uploadMessage.isDuplicate
              ? "bg-amber-50 text-amber-900 border-amber-300"
              : "bg-emerald-50 text-emerald-900 border-emerald-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {uploadMessage.error || uploadMessage.isDuplicate ? (
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            )}
            <span>
              {uploadMessage.error
                ? uploadMessage.error
                : uploadMessage.isDuplicate
                ? uploadMessage.warning
                : `Document "${uploadMessage.document?.filename}" ingested and fields parsed with ${Math.round(
                    uploadMessage.document?.confidenceScore * 100
                  )}% confidence.`}
            </span>
          </div>
          <button
            onClick={() => setUploadMessage(null)}
            className="text-[11px] font-semibold underline opacity-80 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Ingested Documents Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Ingested Document Repository</h2>
          <span className="text-xs text-slate-500">{documents.length} documents on file</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-6">Document Name</th>
                <th className="py-3 px-4">Document Type</th>
                <th className="py-3 px-4">SHA-256 Hash</th>
                <th className="py-3 px-4">Confidence</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-6 text-right">Extracted Fields / Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Loading document archive...
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No documents uploaded yet. Use the upload zone above to ingest files.
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-6 font-medium text-slate-900 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                      <span>{doc.filename}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">
                        {doc.documentType}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[10px] text-slate-400">
                      {doc.fileHashSha256.substring(0, 16)}...
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                        <Check className="h-3 w-3" />
                        {Math.round(doc.confidenceScore * 100)}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          doc.status === "DUPLICATE_FLAGGED"
                            ? "bg-amber-100 text-amber-800 border border-amber-300"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
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
                            setCorrectedValue(doc.extractedFields[0].correctedValue || doc.extractedFields[0].fieldValue);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                        >
                          <Edit2 className="h-3 w-3" /> Verify Fields
                        </button>
                      )}
                      <a
                        href={`/api/documents/${doc.id}/download`}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-800"
                      >
                        <Download className="h-3 w-3" /> File
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-blue-600" />
                Correct Extracted Field
              </h3>
              <button
                onClick={() => {
                  setEditingDoc(null);
                  setEditingField(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-500 text-[11px] mb-1">Document:</label>
                <div className="font-semibold text-slate-800">{editingDoc.filename}</div>
              </div>

              <div>
                <label className="block text-slate-500 text-[11px] mb-1">Select Field to Correct:</label>
                <select
                  value={editingField.id}
                  onChange={(e) => {
                    const f = editingDoc.extractedFields.find((fld: any) => fld.id === e.target.value);
                    if (f) {
                      setEditingField(f);
                      setCorrectedValue(f.correctedValue || f.fieldValue);
                    }
                  }}
                  className="w-full p-2 border border-slate-200 rounded text-xs bg-white"
                >
                  {editingDoc.extractedFields.map((f: any) => (
                    <option key={f.id} value={f.id}>
                      {f.fieldName}: {f.correctedValue || f.fieldValue}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Verified / Corrected Value:</label>
                <input
                  type="text"
                  value={correctedValue}
                  onChange={(e) => setCorrectedValue(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setEditingDoc(null);
                    setEditingField(null);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveFieldCorrection}
                  disabled={savingField}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm"
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

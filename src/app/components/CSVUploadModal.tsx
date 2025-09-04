"use client";

import React, { useState } from "react";

interface CSVUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpload: (file: File, state?: string) => Promise<void>;
    loading: boolean;
}

const CSVUploadModal: React.FC<CSVUploadModalProps> = ({
    isOpen,
    onClose,
    onUpload,
    loading,
}) => {
    const [file, setFile] = useState<File | null>(null);
    const [state, setState] = useState("");
    const [error, setError] = useState("");

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) {
            setFile(null);
            return;
        }

        // Accept common CSV and Excel MIME types and fallback to extension check
        const allowedTypes = [
            "text/csv",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ];
        const allowedExt = [".csv", ".xlsx", ".xls"];

        const typeOk = allowedTypes.includes(selectedFile.type);
        const extOk = allowedExt.some(ext => selectedFile.name.toLowerCase().endsWith(ext));

        if (typeOk || extOk) {
            setFile(selectedFile);
            setError("");
        } else {
            setError("Please select a valid CSV or Excel file (.csv, .xlsx, .xls)");
            setFile(null);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setError("Please select a file");
            return;
        }

        try {
            setError("");
            await onUpload(file, state);
        } catch (error) {
            setError("Upload failed. Please try again.");
        }
    };

    const resetForm = () => {
        setFile(null);
        setState("");
        setError("");
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Upload CSV File</h2>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="space-y-4">
                    {/* State */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            State *
                        </label>
                        <input
                            type="text"
                            value={state}
                            onChange={(e) => setState(e.target.value)}
                            placeholder="e.g., LinkedIn Scrape, Trade Show, etc."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* File Upload */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            CSV File *
                        </label>
                        <input
                            type="file"
                            accept=".csv,.xlsx,.xls"
                            onChange={handleFileChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Supported formats: CSV, XLSX, XLS. Fields are optional. At least one of Company Name, Email, or Phone is recommended.
                        </p>
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div className="text-red-600 text-sm">{error}</div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex space-x-3 pt-4">
                        <button
                            onClick={handleClose}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleUpload}
                            disabled={loading || !file}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? "Uploading..." : "Upload"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CSVUploadModal;

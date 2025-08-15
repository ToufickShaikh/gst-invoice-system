import React, { useState } from 'react';
import { billingAPI } from '../api/billing';
import { toast } from 'react-hot-toast';

const BackendDiagnostic = () => {
    const [testResults, setTestResults] = useState([]);
    const [isRunning, setIsRunning] = useState(false);

    const addResult = (test, success, message, data = null) => {
        setTestResults(prev => [...prev, { test, success, message, data, timestamp: new Date() }]);
    };

    const runDiagnostics = async () => {
        setIsRunning(true);
        setTestResults([]);

        try {
            // Test 1: Check API Base URL
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';
            addResult('API Base URL', true, `Using: ${baseUrl}`);

            // Test 2: Health Check
            try {
                const healthResponse = await fetch(`${baseUrl}/health`);
                const healthData = await healthResponse.json();
                addResult('Health Check', healthResponse.ok, `Status: ${healthResponse.status}`, healthData);
            } catch (error) {
                addResult('Health Check', false, `Error: ${error.message}`);
            }

            // Test 2.5: File Serving Test
            try {
                const fileTestResponse = await fetch(`${baseUrl}/test-file-serving`);
                const fileTestData = await fileTestResponse.json();
                addResult('File Serving Test', fileTestResponse.ok, `Files found: ${fileTestData.filesFound}`, fileTestData);
            } catch (error) {
                addResult('File Serving Test', false, `Error: ${error.message}`);
            }

            // Test 3: Get Invoices
            try {
                const invoices = await billingAPI.getInvoices();
                addResult('Get Invoices', true, `Found ${invoices.length} invoices`, invoices.slice(0, 3));

                if (invoices.length > 0) {
                    const firstInvoice = invoices[0];

                    // Test 4: Reprint First Invoice
                    try {
                        const reprintResult = await billingAPI.reprintInvoice(firstInvoice._id);
                        addResult('Reprint Invoice', true, `PDF Path: ${reprintResult.pdfPath}`, reprintResult);

                        // Test 5: Check PDF accessibility
                        if (reprintResult.pdfPath) {
                            const cleanBaseUrl = baseUrl.replace('/api', '');
                            const pdfUrl = `${cleanBaseUrl}${reprintResult.pdfPath}`;

                            try {
                                const pdfResponse = await fetch(pdfUrl, { method: 'HEAD' });
                                addResult('PDF Accessibility', pdfResponse.ok, `PDF URL: ${pdfUrl}, Status: ${pdfResponse.status}`);
                            } catch (error) {
                                addResult('PDF Accessibility', false, `Error accessing PDF: ${error.message}`);
                            }
                        }
                    } catch (error) {
                        addResult('Reprint Invoice', false, `Error: ${error.message}`, error.response?.data);
                    }
                }
            } catch (error) {
                addResult('Get Invoices', false, `Error: ${error.message}`, error.response?.data);
            }

        } catch (error) {
            addResult('General Error', false, `Unexpected error: ${error.message}`);
        }

        setIsRunning(false);
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">Backend Diagnostic Test</h2>

            <button
                onClick={runDiagnostics}
                disabled={isRunning}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-4 disabled:opacity-50"
            >
                {isRunning ? 'Running Tests...' : 'Run Diagnostic Tests'}
            </button>

            {testResults.length > 0 && (
                <div className="space-y-3">
                    {testResults.map((result, index) => (
                        <div
                            key={index}
                            className={`p-3 rounded border-l-4 ${result.success
                                    ? 'bg-green-50 border-green-500 text-green-800'
                                    : 'bg-red-50 border-red-500 text-red-800'
                                }`}
                        >
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold">
                                    {result.success ? '✅' : '❌'} {result.test}
                                </h3>
                                <span className="text-xs opacity-75">
                                    {result.timestamp.toLocaleTimeString()}
                                </span>
                            </div>
                            <p className="mt-1">{result.message}</p>
                            {result.data && (
                                <details className="mt-2">
                                    <summary className="cursor-pointer text-sm opacity-75">View Data</summary>
                                    <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-32">
                                        {JSON.stringify(result.data, null, 2)}
                                    </pre>
                                </details>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default BackendDiagnostic;

// Test component to demonstrate GSTIN auto-verification
// This is just for demonstration - not part of the main app

import React, { useState } from 'react'
import { gstAPI } from '../api/gst'

const GSTINDemo = () => {
    const [gstin, setGstin] = useState('')
    const [result, setResult] = useState(null)
    const [loading, setLoading] = useState(false)

    const testGSTIN = async () => {
        if (!gstin || gstin.length !== 15) {
            alert('Please enter a valid 15-digit GSTIN')
            return
        }

        setLoading(true)
        setResult(null)

        try {
            // Test validation
            const validation = await gstAPI.validateGSTIN(gstin)
            console.log('Validation:', validation)

            // Test verification
            const verification = await gstAPI.verifyGSTIN(gstin)
            console.log('Verification:', verification)

            // Test tax type detection
            const taxType = await gstAPI.getTaxType('27', gstin.substring(0, 2))
            console.log('Tax Type:', taxType)

            setResult({
                validation,
                verification,
                taxType
            })
        } catch (error) {
            console.error('Error:', error)
            setResult({ error: error.message })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-6 max-w-md mx-auto bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">GSTIN Verification Demo</h2>

            <div className="mb-4">
                <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    placeholder="Enter GSTIN (15 digits)"
                    className="w-full p-2 border rounded"
                    maxLength={15}
                />
            </div>

            <button
                onClick={testGSTIN}
                disabled={loading}
                className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
                {loading ? 'Verifying...' : 'Verify GSTIN'}
            </button>

            {result && (
                <div className="mt-4 p-4 bg-gray-50 rounded">
                    <h3 className="font-bold">Results:</h3>
                    <pre className="text-sm mt-2 overflow-auto">
                        {JSON.stringify(result, null, 2)}
                    </pre>
                </div>
            )}

            <div className="mt-4 text-sm text-gray-600">
                <p><strong>Sample GSTINs to test:</strong></p>
                <p>• 27AABCU9603R1ZX (Maharashtra)</p>
                <p>• 06BZAHM6385P6Z2 (Haryana)</p>
                <p>• 33GSPTN4424G1ZU (Tamil Nadu)</p>
            </div>
        </div>
    )
}

export default GSTINDemo

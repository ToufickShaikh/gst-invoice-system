import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import Button from '../components/Button'
import Card from '../components/Card'
import { toast } from 'react-hot-toast'

const Settings = () => {
  const { user, userProfile, updateProfile, updatePreferences } = useAuth()
  const [settings, setSettings] = useState({
    // App Settings
    theme: userProfile?.preferences?.theme || 'light',
    language: userProfile?.preferences?.language || 'en',
    currency: 'INR',
    dateFormat: 'DD/MM/YYYY',
    timezone: 'Asia/Kolkata',
    
    // Business Settings
    companyName: userProfile?.companyName || 'Your Company Name',
    companyEmail: userProfile?.email || '',
    companyPhone: userProfile?.phone || '',
    companyAddress: userProfile?.address || '',
    gstNumber: userProfile?.gstNumber || '',
    logo: userProfile?.logo || '',
    
    // Advanced Settings
    backupEnabled: false,
    debugMode: false,
    enableAnalytics: true,
    autoBackupInterval: 24, // hours
    maxBackupFiles: 10,
    enableApiLogging: false
  })

  const [activeTab, setActiveTab] = useState('general')
  const [loading, setLoading] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('appSettings')
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings)
        setSettings(prev => ({ ...prev, ...parsed }))
      } catch (error) {
        console.warn('Failed to load settings:', error)
      }
    }
  }, [])

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
    setHasChanges(true)
  }

  const saveSettings = async () => {
    setLoading(true)
    try {
      // Save to localStorage
      localStorage.setItem('appSettings', JSON.stringify(settings))
      
      // Update user preferences in AuthContext
      updatePreferences({
        theme: settings.theme,
        language: settings.language
      })
      
      // Update profile information
      updateProfile({
        email: settings.companyEmail,
        companyName: settings.companyName,
        phone: settings.companyPhone,
        address: settings.companyAddress,
        gstNumber: settings.gstNumber
      })
      
      // Here you could also save to backend if needed
      // await billingAPI.saveSettings(settings)
      
      setHasChanges(false)
      toast.success('Settings saved successfully!', { duration: 3000 })
    } catch (error) {
      console.error('Failed to save settings:', error)
      toast.error('Failed to save settings. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const resetSettings = () => {
    if (window.confirm('Are you sure you want to reset all settings to default? This action cannot be undone.')) {
      localStorage.removeItem('appSettings')
      window.location.reload()
    }
  }

  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'gst-invoice-settings.json'
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Settings exported successfully!')
  }

  const tabs = [
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'business', label: 'Business', icon: '🏢' },
    { id: 'advanced', label: 'Advanced', icon: '🔧' }
  ]

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
        <select
          value={settings.theme}
          onChange={(e) => handleSettingChange('theme', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="auto">Auto (System)</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">Choose your preferred color scheme</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
        <select
          value={settings.language}
          onChange={(e) => handleSettingChange('language', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="en">English</option>
          <option value="hi">हिंदी (Hindi)</option>
          <option value="gu">ગુજરાતી (Gujarati)</option>
          <option value="mr">मराठी (Marathi)</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">Select your preferred interface language</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
        <select
          value={settings.currency}
          onChange={(e) => handleSettingChange('currency', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="INR">INR (₹) - Indian Rupee</option>
          <option value="USD">USD ($) - US Dollar</option>
          <option value="EUR">EUR (€) - Euro</option>
          <option value="GBP">GBP (£) - British Pound</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">Default currency for all transactions</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Date Format</label>
        <select
          value={settings.dateFormat}
          onChange={(e) => handleSettingChange('dateFormat', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2023)</option>
          <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2023)</option>
          <option value="YYYY-MM-DD">YYYY-MM-DD (2023-12-31)</option>
          <option value="DD-MM-YYYY">DD-MM-YYYY (31-12-2023)</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">How dates will be displayed throughout the application</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
        <select
          value={settings.timezone}
          onChange={(e) => handleSettingChange('timezone', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
          <option value="Asia/Dubai">Asia/Dubai (GST)</option>
          <option value="America/New_York">America/New_York (EST)</option>
          <option value="Europe/London">Europe/London (GMT)</option>
          <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">Your business timezone for timestamps</p>
      </div>
    </div>
  )

  const renderBusinessSettings = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Company Name *</label>
        <input
          type="text"
          value={settings.companyName}
          onChange={(e) => handleSettingChange('companyName', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter your company name"
          required
        />
        <p className="text-xs text-gray-500 mt-1">This will appear on all invoices and documents</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Company Email *</label>
        <input
          type="email"
          value={settings.companyEmail}
          onChange={(e) => handleSettingChange('companyEmail', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="company@example.com"
          required
        />
        <p className="text-xs text-gray-500 mt-1">Official business email address</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Company Phone</label>
        <input
          type="tel"
          value={settings.companyPhone}
          onChange={(e) => handleSettingChange('companyPhone', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="+91 9876543210"
        />
        <p className="text-xs text-gray-500 mt-1">Primary contact number for business</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Company Address *</label>
        <textarea
          value={settings.companyAddress}
          onChange={(e) => handleSettingChange('companyAddress', e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter your complete business address including city, state, and PIN code"
          required
        />
        <p className="text-xs text-gray-500 mt-1">Complete registered business address</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">GST Number</label>
        <input
          type="text"
          value={settings.gstNumber}
          onChange={(e) => handleSettingChange('gstNumber', e.target.value.toUpperCase())}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="22AAAAA0000A1Z5"
          maxLength={15}
        />
        <p className="text-xs text-gray-500 mt-1">15-character GST identification number (if registered)</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Company Logo</label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="mt-2">
              <button
                type="button"
                className="bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Upload company logo
              </button>
              <p className="text-xs text-gray-500">PNG, JPG up to 2MB</p>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">Optional logo to appear on invoices</p>
      </div>
    </div>
  )

  const renderAdvancedSettings = () => (
    <div className="space-y-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex">
          <svg className="flex-shrink-0 w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">Advanced Settings</h3>
            <p className="text-sm text-yellow-700 mt-1">These settings are for advanced users. Change them only if you understand their implications.</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-4">Data & Backup</h4>
          <div className="space-y-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.backupEnabled}
                onChange={(e) => handleSettingChange('backupEnabled', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-3 text-sm text-gray-700">Enable automatic backups</span>
            </label>
            
            {settings.backupEnabled && (
              <div className="ml-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Backup Interval</label>
                  <select
                    value={settings.autoBackupInterval}
                    onChange={(e) => handleSettingChange('autoBackupInterval', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={1}>Every hour</option>
                    <option value={6}>Every 6 hours</option>
                    <option value={12}>Every 12 hours</option>
                    <option value={24}>Daily</option>
                    <option value={168}>Weekly</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Backup Files</label>
                  <input
                    type="number"
                    value={settings.maxBackupFiles}
                    onChange={(e) => handleSettingChange('maxBackupFiles', parseInt(e.target.value) || 5)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="5"
                    max="50"
                  />
                  <p className="text-xs text-gray-500 mt-1">Number of backup files to keep (older files will be deleted)</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t pt-6">
          <h4 className="text-sm font-medium text-gray-900 mb-4">System</h4>
          <div className="space-y-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.debugMode}
                onChange={(e) => handleSettingChange('debugMode', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-3 text-sm text-gray-700">Debug mode</span>
            </label>
            <p className="text-xs text-gray-500 ml-6">Shows detailed error messages and logs (for developers)</p>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.enableApiLogging}
                onChange={(e) => handleSettingChange('enableApiLogging', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-3 text-sm text-gray-700">Enable API request logging</span>
            </label>
            <p className="text-xs text-gray-500 ml-6">Log all API requests for debugging purposes</p>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.enableAnalytics}
                onChange={(e) => handleSettingChange('enableAnalytics', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-3 text-sm text-gray-700">Enable usage analytics</span>
            </label>
            <p className="text-xs text-gray-500 ml-6">Help improve the application by sharing anonymous usage data</p>
          </div>
        </div>

        <div className="border-t pt-6">
          <h4 className="text-sm font-medium text-gray-900 mb-4">Data Management</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              variant="outline"
              onClick={exportSettings}
              leftIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
            >
              Export Settings
            </Button>
            
            <Button
              variant="outline"
              onClick={() => {
                const input = document.createElement('input')
                input.type = 'file'
                input.accept = '.json'
                input.onchange = (e) => {
                  const file = e.target.files[0]
                  if (file) {
                    const reader = new FileReader()
                    reader.onload = (e) => {
                      try {
                        const importedSettings = JSON.parse(e.target.result)
                        setSettings(prev => ({ ...prev, ...importedSettings }))
                        setHasChanges(true)
                        toast.success('Settings imported successfully!')
                      } catch (error) {
                        toast.error('Invalid settings file format')
                      }
                    }
                    reader.readAsText(file)
                  }
                }
                input.click()
              }}
              leftIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
              }
            >
              Import Settings
            </Button>
            
            <Button
              variant="danger"
              onClick={resetSettings}
              leftIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              }
            >
              Reset All Settings
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                if (window.confirm('This will clear all application data including invoices, customers, and items. This action cannot be undone. Are you sure?')) {
                  localStorage.clear()
                  window.location.reload()
                }
              }}
              leftIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              }
            >
              Clear All Data
            </Button>
          </div>
        </div>
      </div>
    </div>
  )

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general': return renderGeneralSettings()
      case 'business': return renderBusinessSettings()
      case 'advanced': return renderAdvancedSettings()
      default: return renderGeneralSettings()
    }
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Application Settings</h1>
              <p className="text-gray-600">Customize your GST Invoice application</p>
            </div>
          </div>
          
          {/* User Info */}
          <div className="bg-gray-50 rounded-lg p-4 mt-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-semibold">
                  {(user?.email || 'U')[0].toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Logged in as: {user?.email || 'User'}</p>
                <p className="text-xs text-gray-500">Account created for professional billing</p>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Tabs and Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {renderTabContent()}
          </div>
        </div>

        {/* Save Button */}
        {hasChanges && (
          <div className="sticky bottom-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span>You have unsaved changes</span>
              </div>
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  loading={loading}
                  onClick={saveSettings}
                  leftIcon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  }
                >
                  Save Settings
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default Settings

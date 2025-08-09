import React, { useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import InputField from './InputField';

const InvoiceSettings = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('display');
  const [settings, setSettings] = useState({
    // Display Settings
    itemsPerPage: 25,
    defaultView: 'table',
    showAnalytics: true,
    autoRefresh: false,
    refreshInterval: 30,
    
    // Export Settings
    defaultExportFormat: 'excel',
    includeCustomerDetails: true,
    includeItemDetails: false,
    exportDateFormat: 'DD/MM/YYYY',
    
    // Notification Settings
    emailNotifications: true,
    whatsappIntegration: true,
    paymentReminders: true,
    overdueAlerts: true,
    lowStockAlerts: true,
    
    // Payment Settings
    defaultPaymentTerms: 30,
    latePaymentFee: 2.5,
    enablePartialPayments: true,
    autoCalculateInterest: false,
    
    // Invoice Template Settings
    defaultTemplate: 'professional',
    showCompanyLogo: true,
    includeTermsConditions: true,
    showBankDetails: true,
    showQRCode: true,
    
    // Security Settings
    requireApproval: false,
    allowEdit: true,
    allowDelete: true,
    auditTrail: true,
    
    // Integration Settings
    syncWithAccounting: false,
    backupToCloud: true,
    apiAccess: false
  });

  const handleSettingChange = (section, key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const saveSettings = () => {
    // Save settings to localStorage or API
    localStorage.setItem('invoiceSettings', JSON.stringify(settings));
    onClose();
    // Show success message
  };

  const resetSettings = () => {
    if (window.confirm('Reset all settings to default values?')) {
      setSettings({
        itemsPerPage: 25,
        defaultView: 'table',
        showAnalytics: true,
        autoRefresh: false,
        refreshInterval: 30,
        defaultExportFormat: 'excel',
        includeCustomerDetails: true,
        includeItemDetails: false,
        exportDateFormat: 'DD/MM/YYYY',
        emailNotifications: true,
        whatsappIntegration: true,
        paymentReminders: true,
        overdueAlerts: true,
        lowStockAlerts: true,
        defaultPaymentTerms: 30,
        latePaymentFee: 2.5,
        enablePartialPayments: true,
        autoCalculateInterest: false,
        defaultTemplate: 'professional',
        showCompanyLogo: true,
        includeTermsConditions: true,
        showBankDetails: true,
        showQRCode: true,
        requireApproval: false,
        allowEdit: true,
        allowDelete: true,
        auditTrail: true,
        syncWithAccounting: false,
        backupToCloud: true,
        apiAccess: false
      });
    }
  };

  const tabs = [
    { id: 'display', label: 'Display', icon: '🖥️' },
    { id: 'export', label: 'Export', icon: '📤' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'payments', label: 'Payments', icon: '💳' },
    { id: 'templates', label: 'Templates', icon: '📄' },
    { id: 'security', label: 'Security', icon: '🔒' },
    { id: 'integrations', label: 'Integrations', icon: '🔗' }
  ];

  const SettingGroup = ({ title, children }) => (
    <div className="mb-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
      <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
        {children}
      </div>
    </div>
  );

  const ToggleSetting = ({ label, description, value, onChange }) => (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm font-medium text-gray-900">{label}</div>
        {description && <div className="text-sm text-gray-500">{description}</div>}
      </div>
      <button
        type="button"
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          value ? 'bg-blue-600' : 'bg-gray-200'
        }`}
        onClick={() => onChange(!value)}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            value ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'display':
        return (
          <div>
            <SettingGroup title="List Display">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Items per page</label>
                  <select
                    value={settings.itemsPerPage}
                    onChange={(e) => handleSettingChange('display', 'itemsPerPage', parseInt(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Default view</label>
                  <select
                    value={settings.defaultView}
                    onChange={(e) => handleSettingChange('display', 'defaultView', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  >
                    <option value="table">Table View</option>
                    <option value="grid">Grid View</option>
                    <option value="list">List View</option>
                  </select>
                </div>
              </div>
              <ToggleSetting
                label="Show analytics dashboard"
                description="Display analytics and insights at the top of the page"
                value={settings.showAnalytics}
                onChange={(value) => handleSettingChange('display', 'showAnalytics', value)}
              />
            </SettingGroup>

            <SettingGroup title="Auto Refresh">
              <ToggleSetting
                label="Auto refresh data"
                description="Automatically refresh invoice data at regular intervals"
                value={settings.autoRefresh}
                onChange={(value) => handleSettingChange('display', 'autoRefresh', value)}
              />
              {settings.autoRefresh && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Refresh interval (seconds)</label>
                  <input
                    type="number"
                    min="10"
                    max="300"
                    value={settings.refreshInterval}
                    onChange={(e) => handleSettingChange('display', 'refreshInterval', parseInt(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  />
                </div>
              )}
            </SettingGroup>
          </div>
        );

      case 'export':
        return (
          <div>
            <SettingGroup title="Export Preferences">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Default export format</label>
                <select
                  value={settings.defaultExportFormat}
                  onChange={(e) => handleSettingChange('export', 'defaultExportFormat', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                >
                  <option value="excel">Excel (.xlsx)</option>
                  <option value="csv">CSV (.csv)</option>
                  <option value="pdf">PDF (.pdf)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date format</label>
                <select
                  value={settings.exportDateFormat}
                  onChange={(e) => handleSettingChange('export', 'exportDateFormat', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
              <ToggleSetting
                label="Include customer details"
                description="Export customer information with invoice data"
                value={settings.includeCustomerDetails}
                onChange={(value) => handleSettingChange('export', 'includeCustomerDetails', value)}
              />
              <ToggleSetting
                label="Include item details"
                description="Export individual item information"
                value={settings.includeItemDetails}
                onChange={(value) => handleSettingChange('export', 'includeItemDetails', value)}
              />
            </SettingGroup>
          </div>
        );

      case 'notifications':
        return (
          <div>
            <SettingGroup title="Communication">
              <ToggleSetting
                label="Email notifications"
                description="Send automated email notifications for invoice events"
                value={settings.emailNotifications}
                onChange={(value) => handleSettingChange('notifications', 'emailNotifications', value)}
              />
              <ToggleSetting
                label="WhatsApp integration"
                description="Enable WhatsApp messaging for invoices and reminders"
                value={settings.whatsappIntegration}
                onChange={(value) => handleSettingChange('notifications', 'whatsappIntegration', value)}
              />
            </SettingGroup>

            <SettingGroup title="Alerts">
              <ToggleSetting
                label="Payment reminders"
                description="Automatically send payment reminders before due date"
                value={settings.paymentReminders}
                onChange={(value) => handleSettingChange('notifications', 'paymentReminders', value)}
              />
              <ToggleSetting
                label="Overdue alerts"
                description="Send alerts for overdue payments"
                value={settings.overdueAlerts}
                onChange={(value) => handleSettingChange('notifications', 'overdueAlerts', value)}
              />
              <ToggleSetting
                label="Low stock alerts"
                description="Get notified when item stock is running low"
                value={settings.lowStockAlerts}
                onChange={(value) => handleSettingChange('notifications', 'lowStockAlerts', value)}
              />
            </SettingGroup>
          </div>
        );

      case 'payments':
        return (
          <div>
            <SettingGroup title="Payment Terms">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Default payment terms (days)</label>
                <input
                  type="number"
                  min="0"
                  max="365"
                  value={settings.defaultPaymentTerms}
                  onChange={(e) => handleSettingChange('payments', 'defaultPaymentTerms', parseInt(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Late payment fee (%)</label>
                <input
                  type="number"
                  min="0"
                  max="25"
                  step="0.1"
                  value={settings.latePaymentFee}
                  onChange={(e) => handleSettingChange('payments', 'latePaymentFee', parseFloat(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
              </div>
              <ToggleSetting
                label="Enable partial payments"
                description="Allow customers to make partial payments"
                value={settings.enablePartialPayments}
                onChange={(value) => handleSettingChange('payments', 'enablePartialPayments', value)}
              />
              <ToggleSetting
                label="Auto-calculate interest"
                description="Automatically calculate interest on overdue payments"
                value={settings.autoCalculateInterest}
                onChange={(value) => handleSettingChange('payments', 'autoCalculateInterest', value)}
              />
            </SettingGroup>
          </div>
        );

      case 'templates':
        return (
          <div>
            <SettingGroup title="Invoice Template">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Default template</label>
                <select
                  value={settings.defaultTemplate}
                  onChange={(e) => handleSettingChange('templates', 'defaultTemplate', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                >
                  <option value="professional">Professional</option>
                  <option value="modern">Modern</option>
                  <option value="classic">Classic</option>
                  <option value="minimal">Minimal</option>
                </select>
              </div>
              <ToggleSetting
                label="Show company logo"
                description="Include company logo in invoice template"
                value={settings.showCompanyLogo}
                onChange={(value) => handleSettingChange('templates', 'showCompanyLogo', value)}
              />
              <ToggleSetting
                label="Include terms & conditions"
                description="Add terms and conditions to invoice footer"
                value={settings.includeTermsConditions}
                onChange={(value) => handleSettingChange('templates', 'includeTermsConditions', value)}
              />
              <ToggleSetting
                label="Show bank details"
                description="Display bank account information for payments"
                value={settings.showBankDetails}
                onChange={(value) => handleSettingChange('templates', 'showBankDetails', value)}
              />
              <ToggleSetting
                label="Show QR code"
                description="Include UPI QR code for digital payments"
                value={settings.showQRCode}
                onChange={(value) => handleSettingChange('templates', 'showQRCode', value)}
              />
            </SettingGroup>
          </div>
        );

      case 'security':
        return (
          <div>
            <SettingGroup title="Access Control">
              <ToggleSetting
                label="Require approval for invoices"
                description="Invoices need approval before being sent"
                value={settings.requireApproval}
                onChange={(value) => handleSettingChange('security', 'requireApproval', value)}
              />
              <ToggleSetting
                label="Allow editing invoices"
                description="Permit modification of existing invoices"
                value={settings.allowEdit}
                onChange={(value) => handleSettingChange('security', 'allowEdit', value)}
              />
              <ToggleSetting
                label="Allow deleting invoices"
                description="Permit deletion of invoices"
                value={settings.allowDelete}
                onChange={(value) => handleSettingChange('security', 'allowDelete', value)}
              />
            </SettingGroup>

            <SettingGroup title="Audit & Compliance">
              <ToggleSetting
                label="Audit trail"
                description="Keep detailed logs of all invoice activities"
                value={settings.auditTrail}
                onChange={(value) => handleSettingChange('security', 'auditTrail', value)}
              />
            </SettingGroup>
          </div>
        );

      case 'integrations':
        return (
          <div>
            <SettingGroup title="Third-party Integrations">
              <ToggleSetting
                label="Sync with accounting software"
                description="Automatically sync invoice data with accounting systems"
                value={settings.syncWithAccounting}
                onChange={(value) => handleSettingChange('integrations', 'syncWithAccounting', value)}
              />
              <ToggleSetting
                label="Cloud backup"
                description="Automatically backup invoice data to cloud storage"
                value={settings.backupToCloud}
                onChange={(value) => handleSettingChange('integrations', 'backupToCloud', value)}
              />
              <ToggleSetting
                label="API access"
                description="Enable API access for third-party applications"
                value={settings.apiAccess}
                onChange={(value) => handleSettingChange('integrations', 'apiAccess', value)}
              />
            </SettingGroup>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Invoice Settings"
      className="max-w-4xl mx-auto"
    >
      <div className="flex h-96">
        {/* Sidebar */}
        <div className="w-1/3 border-r border-gray-200 pr-4">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="w-2/3 pl-6 overflow-y-auto">
          {renderTabContent()}
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
        <Button
          variant="outline"
          onClick={resetSettings}
        >
          Reset to Defaults
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={saveSettings}
          >
            Save Settings
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default InvoiceSettings;

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import InputField from '../components/InputField'
import Button from '../components/Button'

const Login = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    tenantId: ''
  })
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(false)
  const [showSuperAdmin, setShowSuperAdmin] = useState(false)

  useEffect(() => {
    // Load available tenants
    fetch('/api/auth/tenants')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setTenants(data.tenants)
        }
      })
      .catch(console.error)
  }, [])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      const data = await response.json()
      
      if (data.success) {
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        
        toast.success('Login successful!')
        
        // Redirect based on role
        if (data.user.role === 'super_admin') {
          navigate('/admin')
        } else {
          navigate('/dashboard')
        }
      } else {
        toast.error(data.message || 'Login failed')
      }
    } catch (error) {
      toast.error('Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-800">GST Billing System</h2>
            <div className="mt-2 bg-gradient-to-r from-yellow-600 to-yellow-800 text-white py-2 px-4 rounded-lg">
              <p className="text-sm font-medium">Shaikh Carpets and Mats</p>
              <p className="text-xs opacity-75">Professional Invoice Management</p>
            </div>
          </div>
          <form onSubmit={handleSubmit}>
            <InputField
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter email address"
              required
            />
            
            <InputField
              label="Password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter password"
              required
            />
            
            {!showSuperAdmin && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Organization</label>
                <select
                  name="tenantId"
                  value={formData.tenantId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required={!showSuperAdmin}
                >
                  <option value="">Select Organization</option>
                  {tenants.map(tenant => (
                    <option key={tenant._id} value={tenant._id}>
                      {tenant.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            <Button type="submit" variant="primary" className="w-full" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => {
                setShowSuperAdmin(!showSuperAdmin)
                setFormData({ email: '', password: '', tenantId: '' })
              }}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium focus:outline-none"
            >
              {showSuperAdmin ? 'Switch to Tenant Login' : 'Super Admin Login'}
            </button>
          </div>

          {/* Developer Credit */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Developed by{' '}
              <a
                href="https://instagram.com/digital_hokage"
                target="_blank"
                rel="noopener noreferrer"
                className="text-yellow-600 hover:text-yellow-800 underline font-medium"
              >
                @Digital_hokage
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login

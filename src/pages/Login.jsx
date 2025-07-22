import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { authAPI } from '../api/auth'
import InputField from '../components/InputField'
import Button from '../components/Button'

const Login = () => {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await authAPI.login(formData)
      login(response.user)
      toast.success('Login successful!')
      navigate('/dashboard')
    } catch (error) {
      toast.error('Invalid credentials')
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
              <p className="text-sm font-medium">Shaikh Tools and Dies</p>
              <p className="text-xs opacity-75">Professional Invoice Management</p>
            </div>
          </div>
          <form onSubmit={handleSubmit}>
            <InputField
              label="Username"
              name="username"
              type="text"
              value={formData.username}
              onChange={handleChange}
              placeholder="Enter username"
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
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
          <p className="text-sm text-gray-600 text-center mt-4">
            Demo: username: hokage, password: admin
          </p>

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
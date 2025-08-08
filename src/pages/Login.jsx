import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import InputField from '../components/InputField'
import Button from '../components/Button'

const Login = () => {
  const navigate = useNavigate()
  const { login, register } = useAuth()
  const [isRegisterMode, setIsRegisterMode] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
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
      if (isRegisterMode) {
        await register(formData.username, formData.email, formData.password)
        toast.success('Registration successful! Please log in.')
        setIsRegisterMode(false) // Switch to login mode after successful registration
      } else {
        await login(formData.username, formData.password)
        toast.success('Login successful!')
        navigate('/dashboard')
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'An error occurred. Please try again.'
      toast.error(errorMessage)
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
              label="Username"
              name="username"
              type="text"
              value={formData.username}
              onChange={handleChange}
              placeholder="Enter username"
              required
            />
            {isRegisterMode && (
              <InputField
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter email address"
                required
              />
            )}
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
              {loading ? (isRegisterMode ? 'Registering...' : 'Logging in...') : (isRegisterMode ? 'Register' : 'Login')}
            </Button>
          </form>
          <p className="text-sm text-gray-600 text-center mt-4">
            {isRegisterMode ? (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setIsRegisterMode(false)}
                  className="text-yellow-600 hover:text-yellow-800 font-medium focus:outline-none"
                >
                  Login
                </button>
              </>
            ) : (
              <>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setIsRegisterMode(true)}
                  className="text-yellow-600 hover:text-yellow-800 font-medium focus:outline-none"
                >
                  Register
                </button>
              </>
            )}
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

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
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">GST Billing System</h2>
            <div className="mt-2 bg-gradient-to-r from-yellow-600 to-yellow-800 text-white py-2 px-4 rounded-lg inline-block">
              <p className="text-sm font-medium">Shaikh Carpets and Mats</p>
            </div>
          </div>

          <div className="p-6 border rounded-md bg-yellow-50">
            <h3 className="text-lg font-semibold text-yellow-800">Authentication removed</h3>
            <p className="mt-2 text-sm text-yellow-700">Authentication and login have been removed from this build. All user-facing features are available without signing in.</p>
            <p className="mt-3 text-xs text-gray-600">If you expected a private account, contact the system administrator.</p>
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

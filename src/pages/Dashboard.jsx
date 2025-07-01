import React, { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import Layout from '../components/Layout'
import Card from '../components/Card'
import InputField from '../components/InputField'
import Button from '../components/Button'
import { billingAPI } from '../api/billing'
import { formatCurrency } from '../utils/dateHelpers'

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalSales: 0,
    totalPayable: 0,
    totalReceivable: 0
  })
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  })
  const [loading, setLoading] = useState(false)

  const fetchStats = async () => {
    setLoading(true)
    try {
      const response = await billingAPI.getDashboardStats(dateRange)
      // Accept both {totalSales, ...} and {data: {totalSales, ...}}
      const data = response && typeof response === 'object' && 'totalSales' in response
        ? response
        : (response && response.data ? response.data : {});
      setStats({
        totalSales: data.totalSales || 0,
        totalPayable: data.totalPayable || 0,
        totalReceivable: data.totalReceivable || 0
      })
    } catch (error) {
      setStats({ totalSales: 0, totalPayable: 0, totalReceivable: 0 })
      toast.error('Failed to fetch stats')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const handleDateChange = (e) => {
    setDateRange({ ...dateRange, [e.target.name]: e.target.value })
  }

  const handleFilter = () => {
    fetchStats()
  }

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>

        {/* Date Filter */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputField
              label="Start Date"
              type="date"
              name="startDate"
              value={dateRange.startDate}
              onChange={handleDateChange}
            />
            <InputField
              label="End Date"
              type="date"
              name="endDate"
              value={dateRange.endDate}
              onChange={handleDateChange}
            />
            <div className="flex items-end">
              <Button onClick={handleFilter} disabled={loading}>
                {loading ? 'Loading...' : 'Filter'}
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card
            title="Total Sales"
            value={formatCurrency(stats.totalSales)}
            color="green"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <Card
            title="Total Payable"
            value={formatCurrency(stats.totalPayable)}
            color="red"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            }
          />
          <Card
            title="Total Receivable"
            value={formatCurrency(stats.totalReceivable)}
            color="blue"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
            }
          />
        </div>
      </div>
    </Layout>
  )
}

export default Dashboard
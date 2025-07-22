import React, { useState } from 'react'
import Layout from '../components/Layout'
import Card from '../components/Card'
import Button from '../components/Button'
import Table from '../components/Table'
import Modal from '../components/Modal'
import InputField from '../components/InputField'
import { toast } from 'react-hot-toast'

const Assignments = () => {
    const [assignments, setAssignments] = useState([
        {
            _id: '1',
            taskName: 'Steel Die Manufacturing',
            assignedTo: 'Rajesh Kumar',
            priority: 'High',
            status: 'In Progress',
            dueDate: '2025-01-15',
            progress: 65,
            description: 'Manufacturing precision steel die for automotive parts'
        },
        {
            _id: '2',
            taskName: 'Quality Inspection - Batch A',
            assignedTo: 'Priya Sharma',
            priority: 'Medium',
            status: 'Pending',
            dueDate: '2025-01-12',
            progress: 0,
            description: 'Quality check for batch A manufactured items'
        },
        {
            _id: '3',
            taskName: 'Customer Follow-up - ABC Corp',
            assignedTo: 'Amit Singh',
            priority: 'Low',
            status: 'Completed',
            dueDate: '2025-01-10',
            progress: 100,
            description: 'Follow up on pending payment from ABC Corp'
        }
    ])

    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingAssignment, setEditingAssignment] = useState(null)
    const [formData, setFormData] = useState({
        taskName: '',
        assignedTo: '',
        priority: 'Medium',
        status: 'Pending',
        dueDate: '',
        description: ''
    })

    const [stats] = useState({
        totalTasks: 45,
        inProgress: 12,
        completed: 28,
        overdue: 5
    })

    const columns = [
        { key: 'taskName', label: 'Task Name' },
        { key: 'assignedTo', label: 'Assigned To' },
        { key: 'priority', label: 'Priority' },
        { key: 'status', label: 'Status' },
        { key: 'dueDate', label: 'Due Date' },
        { key: 'progressBar', label: 'Progress' }
    ]

    // Add progress bar to data
    const assignmentsWithProgress = assignments.map(assignment => ({
        ...assignment,
        progressBar: (
            <div className="flex items-center space-x-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                        className={`h-2 rounded-full ${assignment.progress === 100 ? 'bg-green-500' :
                                assignment.progress >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                        style={{ width: `${assignment.progress}%` }}
                    ></div>
                </div>
                <span className="text-sm text-gray-600">{assignment.progress}%</span>
            </div>
        )
    }))

    const handleSubmit = (e) => {
        e.preventDefault()

        const newAssignment = {
            _id: Date.now().toString(),
            ...formData,
            progress: 0
        }

        if (editingAssignment) {
            setAssignments(assignments.map(a =>
                a._id === editingAssignment._id ? { ...newAssignment, _id: editingAssignment._id } : a
            ))
            toast.success('Assignment updated successfully!')
        } else {
            setAssignments([...assignments, newAssignment])
            toast.success('Assignment created successfully!')
        }

        handleCloseModal()
    }

    const handleEdit = (assignment) => {
        setEditingAssignment(assignment)
        setFormData({
            taskName: assignment.taskName,
            assignedTo: assignment.assignedTo,
            priority: assignment.priority,
            status: assignment.status,
            dueDate: assignment.dueDate,
            description: assignment.description
        })
        setIsModalOpen(true)
    }

    const handleDelete = (assignment) => {
        if (window.confirm('Are you sure you want to delete this assignment?')) {
            setAssignments(assignments.filter(a => a._id !== assignment._id))
            toast.success('Assignment deleted successfully!')
        }
    }

    const handleCloseModal = () => {
        setIsModalOpen(false)
        setEditingAssignment(null)
        setFormData({
            taskName: '',
            assignedTo: '',
            priority: 'Medium',
            status: 'Pending',
            dueDate: '',
            description: ''
        })
    }

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    return (
        <Layout>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold">Work Assignments</h1>
                    <Button onClick={() => setIsModalOpen(true)}>
                        Create Assignment
                    </Button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card
                        title="Total Tasks"
                        value={stats.totalTasks}
                        color="blue"
                        icon={
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                        }
                    />
                    <Card
                        title="In Progress"
                        value={stats.inProgress}
                        color="yellow"
                        icon={
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        }
                    />
                    <Card
                        title="Completed"
                        value={stats.completed}
                        color="green"
                        icon={
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        }
                    />
                    <Card
                        title="Overdue"
                        value={stats.overdue}
                        color="red"
                        icon={
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.866-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                        }
                    />
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                    <div className="flex flex-wrap gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            leftIcon={
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H8a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            }
                            onClick={() => alert('Assign production task - Coming soon!')}
                        >
                            Assign Production
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            leftIcon={
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            }
                            onClick={() => alert('Schedule quality check - Coming soon!')}
                        >
                            Quality Check
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            leftIcon={
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                            }
                            onClick={() => alert('Customer follow-up - Coming soon!')}
                        >
                            Customer Follow-up
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            leftIcon={
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            }
                            onClick={() => alert('Generate reports - Coming soon!')}
                        >
                            Generate Report
                        </Button>
                    </div>
                </div>

                {/* Assignments Table */}
                <div className="bg-white rounded-lg shadow">
                    <Table
                        columns={columns}
                        data={assignmentsWithProgress}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        sortable={true}
                        searchable={true}
                        pagination={true}
                        pageSize={10}
                        emptyMessage="No assignments found"
                    />
                </div>

                {/* Assignment Modal */}
                <Modal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    title={`${editingAssignment ? 'Edit' : 'Create'} Assignment`}
                >
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <InputField
                            label="Task Name"
                            name="taskName"
                            value={formData.taskName}
                            onChange={handleChange}
                            placeholder="Enter task name"
                            required
                        />

                        <InputField
                            label="Assigned To"
                            name="assignedTo"
                            value={formData.assignedTo}
                            onChange={handleChange}
                            placeholder="Enter worker/employee name"
                            required
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Priority
                                </label>
                                <select
                                    name="priority"
                                    value={formData.priority}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                >
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Status
                                </label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                >
                                    <option value="Pending">Pending</option>
                                    <option value="In Progress">In Progress</option>
                                    <option value="Completed">Completed</option>
                                    <option value="On Hold">On Hold</option>
                                </select>
                            </div>
                        </div>

                        <InputField
                            label="Due Date"
                            name="dueDate"
                            type="date"
                            value={formData.dueDate}
                            onChange={handleChange}
                            required
                        />

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description
                            </label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                placeholder="Enter task description"
                            />
                        </div>

                        <div className="flex justify-end space-x-3 pt-4">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={handleCloseModal}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" variant="primary">
                                {editingAssignment ? 'Update' : 'Create'} Assignment
                            </Button>
                        </div>
                    </form>
                </Modal>
            </div>
        </Layout>
    )
}

export default Assignments

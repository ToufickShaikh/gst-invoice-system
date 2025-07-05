// Enhanced Table component with modern responsive design and features
import React, { memo, useState, useMemo } from 'react'
import Button from './Button'

const Table = memo(({
  columns,
  data,
  onEdit,
  onDelete,
  loading = false,
  sortable = false,
  searchable = false,
  pagination = false,
  pageSize = 10,
  emptyMessage = "No data available",
  className = ""
}) => {
  const [sortField, setSortField] = useState(null)
  const [sortDirection, setSortDirection] = useState('asc')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // Memoized filtered and sorted data
  const processedData = useMemo(() => {
    let filtered = data

    // Apply search filter
    if (searchable && searchTerm) {
      filtered = data.filter(row =>
        columns.some(column =>
          String(row[column.key] || '').toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    }

    // Apply sorting
    if (sortable && sortField) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[sortField]
        const bVal = b[sortField]

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
        }

        const aStr = String(aVal || '').toLowerCase()
        const bStr = String(bVal || '').toLowerCase()

        if (sortDirection === 'asc') {
          return aStr.localeCompare(bStr)
        } else {
          return bStr.localeCompare(aStr)
        }
      })
    }

    return filtered
  }, [data, columns, searchTerm, sortField, sortDirection, searchable, sortable])

  // Pagination calculations
  const totalPages = Math.ceil(processedData.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const paginatedData = pagination
    ? processedData.slice(startIndex, startIndex + pageSize)
    : processedData

  const handleSort = (field) => {
    if (!sortable) return

    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const SortIcon = ({ field }) => {
    if (!sortable || sortField !== field) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      )
    }

    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
      </svg>
    )
  }

  const LoadingSkeleton = () => (
    <div className="animate-pulse">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex space-x-4 p-4 border-b border-gray-200">
          {columns.map((_, j) => (
            <div key={j} className="flex-1 h-4 bg-gray-200 rounded"></div>
          ))}
        </div>
      ))}
    </div>
  )

  return (
    <div className={`bg-white rounded-xl shadow-lg overflow-hidden ${className}`}>
      {/* Search Bar */}
      {searchable && (
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto custom-scrollbar">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  onClick={() => handleSort(column.key)}
                  className={`px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${sortable ? 'cursor-pointer hover:bg-gray-200 transition-colors duration-200' : ''
                    }`}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {sortable && <SortIcon field={column.key} />}
                  </div>
                </th>
              ))}
              {(onEdit || onDelete) && (
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={columns.length + (onEdit || onDelete ? 1 : 0)} className="p-0">
                  <LoadingSkeleton />
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (onEdit || onDelete ? 1 : 0)}
                  className="px-6 py-12 text-center"
                >
                  <div className="flex flex-col items-center">
                    <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <p className="text-gray-500 text-lg font-medium">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => (
                <tr
                  key={row._id || row.id || `row-${index}`}
                  className="hover:bg-gray-50 transition-colors duration-150 group"
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                    >
                      {row[column.key]}
                    </td>
                  ))}
                  {(onEdit || onDelete) && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        {onEdit && (
                          <Button
                            onClick={() => onEdit(row)}
                            variant="ghost"
                            size="sm"
                            leftIcon={
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            }
                          >
                            Edit
                          </Button>
                        )}
                        {onDelete && (
                          <Button
                            onClick={() => onDelete(row)}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            leftIcon={
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            }
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {startIndex + 1} to {Math.min(startIndex + pageSize, processedData.length)} of {processedData.length} results
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                variant="ghost"
                size="sm"
              >
                Previous
              </Button>

              <div className="flex space-x-1">
                {[...Array(totalPages)].map((_, i) => {
                  const page = i + 1
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <Button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        variant={page === currentPage ? 'primary' : 'ghost'}
                        size="sm"
                        className="min-w-[32px]"
                      >
                        {page}
                      </Button>
                    )
                  } else if (page === currentPage - 2 || page === currentPage + 2) {
                    return <span key={page} className="px-2 text-gray-500">...</span>
                  }
                  return null
                })}
              </div>

              <Button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                variant="ghost"
                size="sm"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

Table.displayName = 'Table'

export default Table
// Enhanced Table component with mobile-first responsive design
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
  className = "",
  mobileCardView = true // New prop for mobile card layout
}) => {
  const [sortField, setSortField] = useState(null)
  const [sortDirection, setSortDirection] = useState('asc')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile screen size
  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

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

  // Mobile Card View Component
  const MobileCardView = ({ item, index }) => (
    <div key={index} className="invoice-item-mobile">
      <div className="space-y-3">
        {columns.map((column) => {
          if (column.key === 'actions') return null

          const value = column.render
            ? column.render(item[column.key], item, index)
            : item[column.key]

          return (
            <div key={column.key} className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-500">{column.label}:</span>
              <span className="text-sm text-gray-900 font-medium">{value}</span>
            </div>
          )
        })}

        {/* Mobile Actions */}
        {(onEdit || onDelete) && (
          <div className="flex justify-end space-x-2 pt-3 border-t border-gray-200">
            {onEdit && (
              <Button
                onClick={() => onEdit(item)}
                variant="secondary"
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
                onClick={() => onDelete(item)}
                variant="danger"
                size="sm"
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
        )}
      </div>
    </div>
  )

  return (
    <div className={`bg-white rounded-lg sm:rounded-xl shadow-md sm:shadow-lg overflow-hidden ${className}`}>
      {/* Search Bar - Mobile optimized */}
      {searchable && (
        <div className="p-3 sm:p-4 border-b border-gray-200">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-enhanced pl-9 sm:pl-10 text-sm sm:text-base"
            />
          </div>
        </div>
      )}

      {loading ? (
        <LoadingSkeleton />
      ) : processedData.length === 0 ? (
        <div className="empty-state-mobile">
          <svg className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-2.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 009.586 13H7" />
          </svg>
          <h3 className="text-sm sm:text-base font-medium text-gray-900 mb-1">No Data Found</h3>
          <p className="text-xs sm:text-sm text-gray-500">{emptyMessage}</p>
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          {isMobile && mobileCardView ? (
            <div className="p-3 sm:p-4 space-y-3">
              {paginatedData.map((item, index) => (
                <MobileCardView key={index} item={item} index={index} />
              ))}
            </div>
          ) : (
            /* Desktop Table View */
            <div className="table-mobile-wrapper">
              <table className="table-enhanced">
                <thead>
                  <tr>
                    {columns.map((column) => (
                      <th
                        key={column.key}
                        onClick={() => handleSort(column.key)}
                        className={`${sortable ? 'cursor-pointer hover:bg-gray-200 transition-smooth' : ''
                          } relative`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs sm:text-sm">{column.label}</span>
                          {sortable && <SortIcon field={column.key} />}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedData.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-smooth">
                      {columns.map((column) => (
                        <td key={column.key} className="text-xs sm:text-sm">
                          {column.key === 'actions' ? (
                            <div className="flex space-x-1 sm:space-x-2">
                              {onEdit && (
                                <Button
                                  onClick={() => onEdit(item)}
                                  variant="secondary"
                                  size="xs"
                                  leftIcon={
                                    <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  }
                                >
                                  <span className="hidden sm:inline">Edit</span>
                                </Button>
                              )}
                              {onDelete && (
                                <Button
                                  onClick={() => onDelete(item)}
                                  variant="danger"
                                  size="xs"
                                  leftIcon={
                                    <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  }
                                >
                                  <span className="hidden sm:inline">Delete</span>
                                </Button>
                              )}
                            </div>
                          ) : (
                            column.render ? column.render(item[column.key], item, index) : item[column.key]
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Pagination - Mobile optimized */}
      {pagination && totalPages > 1 && (
        <div className="px-3 py-3 sm:px-4 sm:py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
          <div className="text-xs sm:text-sm text-gray-700">
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, processedData.length)} of {processedData.length} results
          </div>
          <div className="flex items-center space-x-1 sm:space-x-2">
            <Button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              variant="secondary"
              size="sm"
              className="text-xs sm:text-sm"
            >
              Previous
            </Button>
            {[...Array(totalPages)].map((_, i) => (
              <Button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                variant={currentPage === i + 1 ? "primary" : "secondary"}
                size="sm"
                className="text-xs sm:text-sm min-w-[32px] sm:min-w-[36px]"
              >
                {i + 1}
              </Button>
            ))}
            <Button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              variant="secondary"
              size="sm"
              className="text-xs sm:text-sm"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
})

Table.displayName = 'Table'

export default Table
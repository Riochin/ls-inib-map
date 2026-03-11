'use client'

import { useEffect, useState } from 'react'

interface LocateButtonProps {
  isLocating: boolean
  error: string | null
  onLocate: () => void
}

export function LocateButton({ isLocating, error, onLocate }: LocateButtonProps) {
  const [showError, setShowError] = useState(false)

  useEffect(() => {
    if (error) {
      setShowError(true)
      const timer = setTimeout(() => setShowError(false), 3000)
      return () => clearTimeout(timer)
    }
    setShowError(false)
  }, [error])

  return (
    <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2">
      <button
        onClick={onLocate}
        disabled={isLocating}
        className="w-11 h-11 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-white active:bg-gray-100 disabled:opacity-50 transition-colors"
        aria-label="現在位置を取得"
      >
        {isLocating ? (
          <svg className="w-5 h-5 text-blue-500 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 3L3 10.53v.98l6.84 2.65L12.48 21h.98L21 3z" />
          </svg>
        )}
      </button>
      {showError && error && (
        <div className="bg-red-600 text-white text-xs px-3 py-2 rounded-lg shadow-lg max-w-[200px]">
          {error}
        </div>
      )}
    </div>
  )
}

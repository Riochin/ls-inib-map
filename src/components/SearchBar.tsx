'use client'

import { useRef, useEffect, useCallback } from 'react'
import type { Store } from '@/types/store'
import { VisuallyHiddenStatus } from './VisuallyHiddenStatus'

interface SearchBarProps {
  query: string
  onChange: (query: string) => void
  onSelect: (store: Store) => void
  results: Store[]
  onClose: () => void
}

export function SearchBar({ query, onChange, onSelect, results, onClose }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSelect = useCallback((store: Store) => {
    onSelect(store)
  }, [onSelect])

  const displayResults = query.trim() ? results.slice(0, 20) : []
  const statusMessage = !query.trim() ? '' : results.length > 0 ? `${results.length}件` : '該当する店舗がありません'

  return (
    <div className="absolute top-16 left-4 right-4 z-20">
      <VisuallyHiddenStatus message={statusMessage} />
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg flex items-center gap-2 px-3 py-2">
        <svg className="w-4 h-4 text-gray-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => onChange(e.target.value)}
          placeholder="店舗名・住所で検索"
          className="flex-1 bg-transparent text-sm outline-none text-gray-800 placeholder:text-gray-400 min-h-[36px]"
        />
        {query && (
          <button
            onClick={() => onChange('')}
            className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 shrink-0"
            aria-label="検索をクリア"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-3.5 h-3.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {displayResults.length > 0 && (
        <ul className="mt-1 bg-white rounded-2xl shadow-lg overflow-y-auto max-h-[50dvh]">
          {displayResults.map((store, index) => (
            <li key={store.id} className={index !== 0 ? 'border-t border-gray-100' : ''}>
              <button
                onClick={() => handleSelect(store)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <p className="text-sm font-medium text-gray-800 truncate">{store.name}</p>
                <p className="text-xs text-gray-500 truncate mt-0.5">{store.address}</p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {query.trim() && results.length === 0 && (
        <div className="mt-1 bg-white rounded-2xl shadow-lg px-4 py-3">
          <p className="text-sm text-gray-500">該当する店舗がありません</p>
        </div>
      )}
    </div>
  )
}

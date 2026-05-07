'use client'

interface SearchButtonProps {
  isActive: boolean
  onToggle: () => void
}

export function SearchButton({ isActive, onToggle }: SearchButtonProps) {
  return (
    <div className="absolute top-4 right-4 z-10">
      <button
        onClick={onToggle}
        className="w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-white active:bg-gray-100 transition-colors"
        aria-label={isActive ? '検索を閉じる' : '店舗を検索する'}
      >
        {isActive ? (
          <svg className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        )}
      </button>
    </div>
  )
}

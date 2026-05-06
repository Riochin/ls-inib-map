'use client'

interface AddressFilterButtonProps {
  isActive: boolean
  onOpen: () => void
}

export function AddressFilterButton({ isActive, onOpen }: AddressFilterButtonProps) {
  return (
    <div className="absolute bottom-24 left-4 z-10">
      <button
        onClick={onOpen}
        className="relative w-14 h-14 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center hover:bg-white active:bg-gray-100 transition-colors"
        aria-label="エリアで絞り込む"
      >
        <svg className="w-7 h-7 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
        {isActive && (
          <span className="absolute top-1 right-1 w-3 h-3 bg-blue-600 rounded-full border-2 border-white" />
        )}
      </button>
    </div>
  )
}

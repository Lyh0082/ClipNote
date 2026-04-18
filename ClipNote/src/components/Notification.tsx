import React, { useEffect } from 'react'

interface Props {
  message: string
  type: 'success' | 'error' | 'info'
  onClose: () => void
}

export function Notification({ message, type, onClose }: Props) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000)
    return () => clearTimeout(timer)
  }, [message])

  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'

  return (
    <div className={`notification notification-${type}`}>
      <span className="notification-icon">{icon}</span>
      <span className="notification-message">{message}</span>
      <button className="notification-close" onClick={onClose}>×</button>
    </div>
  )
}

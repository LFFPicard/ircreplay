function Footer() {
  return (
    <footer className="shrink-0 border-t border-gray-800 bg-gray-900 px-6 py-3 flex items-center justify-between">
      <p className="text-green-400 text-xs font-mono">&copy; 2026 IRCReplay.app &mdash; relive the chat</p>
      <p className="text-green-400 text-xs hidden md:block">Built with nostalgia</p>
      <div className="flex items-center gap-3">
        <span className="text-green-400 text-xs hidden sm:block">Keep the lights on:</span>
        <a href="https://ko-fi.com/baggins83" target="_blank" rel="noopener noreferrer" style={{ backgroundColor: '#FF5E5B' }} className="hover:opacity-90 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-opacity">Ko-fi</a>
        <a href="https://www.paypal.com/paypalme/garyt83" target="_blank" rel="noopener noreferrer" style={{ backgroundColor: '#0070BA' }} className="hover:opacity-90 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-opacity">PayPal</a>
      </div>
    </footer>
  )
}

export default Footer
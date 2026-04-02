function Footer() {
  return (
    <footer className="shrink-0 border-t border-gray-800 bg-gray-900 px-4 py-2 flex items-center justify-between gap-2">
      <p className="text-green-400 text-xs font-mono hidden sm:block whitespace-nowrap">&copy; 2026 IRCReplay.app</p>
      <p className="text-green-400 text-xs hidden md:block whitespace-nowrap">Built with nostalgia</p>
      <div className="flex items-center gap-2 ml-auto">
        <a href="/help" className="text-green-400 text-xs hover:text-green-300 transition-colors whitespace-nowrap hidden sm:block">Help</a>
        <span className="text-gray-700 text-xs hidden sm:block">&middot;</span>
        <a href="/links" className="text-green-400 text-xs hover:text-green-300 transition-colors whitespace-nowrap hidden sm:block">Links</a>
        <span className="text-gray-700 text-xs hidden sm:block">&middot;</span>
        <span className="text-green-400 text-xs hidden lg:block whitespace-nowrap">Keep the lights on:</span>
        <a href="https://ko-fi.com/baggins83" target="_blank" rel="noopener noreferrer" className="hover:opacity-90 bg-green-500 text-black text-xs font-semibold px-2 py-1 rounded-full transition-opacity whitespace-nowrap">Ko-fi</a>
        <a href="https://www.paypal.com/paypalme/garyt83" target="_blank" rel="noopener noreferrer" className="hover:opacity-90 bg-green-500 text-black text-xs font-semibold px-2 py-1 rounded-full transition-opacity whitespace-nowrap">PayPal</a>
      </div>
    </footer>
  )
}

export default Footer
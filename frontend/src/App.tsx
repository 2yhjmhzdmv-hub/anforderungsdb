import { Routes, Route, NavLink } from 'react-router-dom'
import { Settings, BookOpen, Search } from 'lucide-react'
import SettingsPage from './pages/SettingsPage'
import LibraryPage from './pages/LibraryPage'
import ReviewPage from './pages/ReviewPage'

const nav = [
  { to: '/settings', label: 'Einstellungen', icon: Settings },
  { to: '/library', label: 'Bibliothek', icon: BookOpen },
  { to: '/', label: 'Prüfansicht', icon: Search },
]

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-8">
        <span className="font-semibold text-gray-800 text-sm tracking-wide uppercase">Anforderungsdatenbank</span>
        <nav className="flex gap-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`
              }
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="flex-1 p-6">
        <Routes>
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/" element={<ReviewPage />} />
        </Routes>
      </main>
    </div>
  )
}

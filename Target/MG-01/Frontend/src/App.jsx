import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth/useAuth';
import Button from './components/ui/Button';
import TransactionTypeListScreen from './screens/TransactionTypeListScreen';
import TransactionTypeDetailScreen from './screens/TransactionTypeDetailScreen';
import TransactionTypeAddScreen from './screens/TransactionTypeAddScreen';

function AppHeader() {
  const { username, logout } = useAuth();
  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          TT
        </span>
        <span>Transaction Type Maintenance</span>
      </div>
      <div className="flex items-center">
        <span className="user-avatar" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" focusable="false">
            <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z" />
          </svg>
        </span>
        <span className="text-sm user-name">{username}</span>
        <Button variant="ghost" size="sm" className="btn-on-dark" onClick={logout}>
          Sign out
        </Button>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <>
      <AppHeader />
      <main>
        <Routes>
          <Route path="/transaction-types" element={<TransactionTypeListScreen />} />
          <Route path="/transaction-types/add" element={<TransactionTypeAddScreen />} />
          <Route path="/transaction-types/details" element={<TransactionTypeDetailScreen />} />
          <Route path="*" element={<Navigate to="/transaction-types" replace />} />
        </Routes>
      </main>
    </>
  );
}

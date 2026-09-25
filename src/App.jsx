import { BrowserRouter, Routes, Route } from 'react-router-dom'

import Home from './pages/Home'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Cases from './pages/Cases'
import NewCase from './pages/NewCase'
import CaseDetails from './pages/CaseDetails'
import Layout from './components/Layout'

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* PUBLIC PAGES */}

        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        {/* LOGGED-IN PORTAL */}

        <Route
          path="/dashboard"
          element={
            <Layout>
              <Dashboard />
            </Layout>
          }
        />

        <Route
          path="/cases"
          element={
            <Layout>
              <Cases />
            </Layout>
          }
        />

        <Route
          path="/new-case"
          element={
            <Layout>
              <NewCase />
            </Layout>
          }
        />

        <Route
          path="/cases/:id"
          element={
            <Layout>
              <CaseDetails />
            </Layout>
          }
        />

      </Routes>
    </BrowserRouter>
  )
}

export default App
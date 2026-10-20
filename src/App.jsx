import { BrowserRouter, Routes, Route } from 'react-router-dom'

import Home from './pages/Home'
import Login from './pages/Login'
import LoginChoice from './pages/LoginChoice'
import LitigantLogin from './pages/LitigantLogin'
import ProfessionalLogin from './pages/ProfessionalLogin'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import ResetPassword from './pages/ResetPassword'
import ForgotPassword from './pages/ForgotPassword'
import Signup from './pages/Signup'
import VerifyEmail from './pages/VerifyEmail'
import Cases from './pages/Cases'
import NewCase from './pages/NewCase'
import CaseDetails from './pages/CaseDetails'
import Layout from './components/Layout'
import ProfessionalApprovals from './pages/ProfessionalApprovals'
import LitigantDashboard from './pages/LitigantDashboard'
import LawyerDashboard from './pages/LawyerDashboard'
import JudgeDashboard from './pages/JudgeDashboard'
import LawyerRecommendations from './pages/LawyerRecommendations'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* PUBLIC PAGES */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<LoginChoice />} />
        <Route path="/login/litigant" element={<LitigantLogin />} />
        <Route path="/login/professional" element={<ProfessionalLogin />} />
        <Route path="/login/admin" element={<AdminLogin />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/admin/approvals" element={<ProfessionalApprovals />} />

                {/* PORTAL PAGES */}
        

        <Route
          path="/litigant"
          element={<LitigantDashboard />}
        />

        <Route
          path="/lawyer"
          element={<Layout><LawyerDashboard /></Layout>}
        />

        <Route
          path="/judge"
          element={<Layout><JudgeDashboard /></Layout>}
        />

        <Route
          path="/cases"
          element={<Layout><Cases /></Layout>}
        />

        <Route
          path="/new-case"
          element={<Layout><NewCase /></Layout>}
        />

      

        <Route
          path="/cases/:id"
          element={<Layout><CaseDetails /></Layout>}
        />

        <Route
  path="/cases/:id/lawyers"
  element={<Layout><LawyerRecommendations /></Layout>}
/>

      </Routes>
    </BrowserRouter>
  )
}

export default App
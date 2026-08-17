import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Login from './pages/Login'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Contacts from './pages/Contacts'
import ContactDetail from './pages/ContactDetail'
import ContactForm from './pages/ContactForm'
import Pipeline from './pages/Pipeline'
import Quotes from './pages/Quotes'
import QuoteDetail from './pages/QuoteDetail'
import Invoices from './pages/Invoices'
import InvoiceDetail from './pages/InvoiceDetail'
import InvoiceEdit from './pages/InvoiceEdit'
import Settings from './pages/Settings'

function PrivateRoute({ children }) {
  return localStorage.getItem('crm_token') ? children : <Navigate to="/login" />
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="contacts" element={<Contacts />} />
          <Route path="contacts/new" element={<ContactForm />} />
          <Route path="contacts/:id" element={<ContactDetail />} />
          <Route path="contacts/:id/edit" element={<ContactForm />} />
          <Route path="pipeline" element={<Pipeline />} />
          <Route path="devis" element={<Quotes />} />
          <Route path="devis/:id" element={<QuoteDetail />} />
          <Route path="factures" element={<Invoices />} />
          <Route path="factures/:id" element={<InvoiceDetail />} />
          <Route path="factures/:id/edit" element={<InvoiceEdit />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

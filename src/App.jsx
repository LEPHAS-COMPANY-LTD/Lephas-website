import { Suspense, lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import { Loader } from './components/ui.jsx'
import Home from './pages/Home.jsx'
import Services from './pages/Services.jsx'
import Talent from './pages/Talent.jsx'
import TalentProfile from './pages/TalentProfile.jsx'
import Portfolio from './pages/Portfolio.jsx'
import ProjectDetail from './pages/ProjectDetail.jsx'
import Process from './pages/Process.jsx'
import Pricing from './pages/Pricing.jsx'
import About from './pages/About.jsx'
import Contact from './pages/Contact.jsx'
import StartProject from './pages/StartProject.jsx'
import RequestStatus from './pages/RequestStatus.jsx'
import RequestLookup from './pages/RequestLookup.jsx'
import DocumentView from './pages/DocumentView.jsx'
import NotFound from './pages/NotFound.jsx'

const AdminApp = lazy(() => import('./admin/AdminApp.jsx'))

export default function App() {
  return (
    <Routes>
      <Route
        path="/admin/*"
        element={
          <Suspense fallback={<Loader />}>
            <AdminApp />
          </Suspense>
        }
      />
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/services" element={<Services />} />
        <Route path="/talent" element={<Talent />} />
        <Route path="/talent/:slug" element={<TalentProfile />} />
        <Route path="/portfolio" element={<Portfolio />} />
        <Route path="/portfolio/:slug" element={<ProjectDetail />} />
        <Route path="/process" element={<Process />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/start" element={<StartProject />} />
        <Route path="/requests" element={<RequestLookup />} />
        <Route path="/requests/:reference" element={<RequestStatus />} />
        <Route path="/requests/:reference/documents/:id" element={<DocumentView />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

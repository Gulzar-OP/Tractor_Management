import { Routes, Route } from "react-router-dom";

import Sidebar from "./layout/Sidebar";
import Topbar from "./layout/Topbar";

import Dashboard from "./features/Dashboard/Dashboard";
import Farmers from "./features/Farmer/Farmer";
import AddFarmer from "./features/Farmer/AddFarmer";
import DueSummary from "./features/Farmer/DueSummary";
import Expenses from "./features/Expenses/Expenses";
import Reports from "./features/Reports/Reports";
import Settings from "./features/Settings/Settings";
import WorkRecords from "./features/WrokRecords/WorkRecords";
import WorkRecordDetails from "./features/Works/WorkRecordDetails";
import PaymentHistory from "./features/Payment/PaymentHistory";
import PaymentPage from "./features/Payment/PaymentPage";
import StartWork from "./features/Works/StartWork";
import AddWork from "./features/Works/AddWork";
import { useState } from "react";
import FarmerDetails from "./features/Farmer/FarmerDetails";
import Login from "./auth/Login"
import Register from "./auth/Register";
// import Auth from "./auth/Auth";
// import DriverLogin from './auth/DriverLogin'
import Drivers from "./features/drivers/Drivers";
import Intro from './Home/Intro'
import DateWiseReport from "./features/Reports/DateWiseReport";
import Works from "./features/Works/Works";
import PaymentRecords from "./features/Payment/PaymentRecords";
import Changelog from "./page/Changelog/Changelog";
import ManageAnnouncements from "./page/Changelog/ManageAnnouncements";
import ProtectedRoute from "./components/ProtectedRoute.jsx"
import HelpCenter from "./features/HelpCenter/HelpCenter";
export default function App() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Routes>
      {/* Routes with NO sidebar/topbar */}
      <Route path="/home" element={<Intro />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      {/* <Route path="/auth" element={<Auth />} /> */}
      {/* <Route path="/login/driver" element={<DriverLogin />} /> */}

      {/* Routes WITH sidebar/topbar layout */}
      <Route
        path="/*"
        element={
          <div className="min-h-screen bg-slate-50 flex">
            <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
            <div className="flex-1 flex flex-col">
              <Topbar setMobileOpen={setMobileOpen} />
              <main className="flex-1 p-4 sm:p-8 max-w-[1400px] w-full mx-auto">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/farmers" element={<Farmers />} />
                  <Route path="/farmers/addFarmer" element={<AddFarmer />} />
                  <Route path="/farmers/due-summary" element={<DueSummary />} />
                  <Route path="/farmers/:farmerId" element={<FarmerDetails />} />

                  <Route path="/workRecords" element={<WorkRecords />} />
                  <Route path="/workRecords/start" element={<StartWork />} />
                  <Route path="/workRecords/add" element={<AddWork />} />
                  <Route path="/workRecords/:id" element={<WorkRecordDetails />} />
                  <Route path="/workRecords/work" element={<Works />} />

                  <Route path="/payments" element={<PaymentPage />} />
                  <Route path="/payments/history" element={<PaymentHistory />} />

                  <Route path="/expenses" element={<Expenses />} />
                  <Route path="/drivers" element={<Drivers />} />
                  <Route
  path="/payment-records"
  element={<PaymentRecords />}
/>
                  {/* <Route path="/reports" element={<Reports />} /> */}
                  <Route path="/reports" element={<DateWiseReport />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route
                    path="/manage-updates"
                    element={
                      <ProtectedRoute allowedRoles={["owner", "admin"]}>
                        <ManageAnnouncements />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/changelog"
                    element={
                      <ProtectedRoute allowedRoles={["owner", "admin", "driver"]}>
                        <Changelog />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/help" element={<HelpCenter />} />
                  {/* <Route
  path="/help"
  element={<HelpCenter role={user?.role} />} */}
{/* /> */}
                </Routes>
              </main>
            </div>
          </div>
        }
      />
    </Routes>
  );
}
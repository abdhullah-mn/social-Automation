import { Navigate, Route, Routes } from "react-router-dom";
import RequireSession from "./components/RequireSession";
import Home from "./pages/Home";
import Login from "./pages/Login";
// import type { Layout } from "lucide-react";
import Accounts from "./pages/Accounts";
import Dashboard from "./pages/Dashboard";
import Layout from "./components/Layout";
import Sheduler from "./pages/Sheduler";
import AIComposer from "./pages/AIcomposer";
export default function App() {
    return (
        <>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route element={<RequireSession />}>
                <Route element={<Layout/>}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/accounts" element={<Accounts />} />
                    <Route path="/scheduler" element={<Sheduler />} />
                    <Route path="/shedule" element={<Navigate to="/scheduler" replace />} />
                    <Route path="/ai-composer" element={<AIComposer />} />
                </Route>
                </Route>
            </Routes>
        </>
    );
}

import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { MailIcon, LockIcon, ArrowRightIcon, User2Icon } from "lucide-react";
import { signIn } from "../lib/api";

export default function Login() {
    const [searchParams, setSearchParams] = useSearchParams();
    const loginState = searchParams.get("mode") !== "signup";
    const planNames: Record<string, string> = { starter: "Starter", pro: "Pro", agency: "Agency" };
    const plan = searchParams.get("plan") || "";
    const selectedPlan = Object.hasOwn(planNames, plan) ? planNames[plan] : undefined;
    const setLoginState = (signIn: boolean) => {
        setSearchParams((current) => {
            const next = new URLSearchParams(current);
            if (signIn) next.delete("mode");
            else next.set("mode", "signup");
            return next;
        });
    };
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;
        setLoading(true);
        setError("");
        try {
            await signIn(loginState ? "login" : "register", { name, email, password });
            const target = searchParams.get("returnTo");
            const path = target?.split("?")[0];
            navigate(path && ["/accounts", "/scheduler", "/shedule", "/dashboard", "/ai-composer"].includes(path) ? target! : "/dashboard", { replace: true });
        } catch (failure) {
            setError(failure instanceof Error ? failure.message : "Unable to sign in");
        } finally { setLoading(false); }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
            <div className="relative w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-sm p-8">
                    <div className="flex flex-col items-center mb-8">
                        <Link to="/" className="flex items-center gap-2">
                            <img src="/logo.svg" alt="Logo" className="size-6.5" />
                            <h1 className="text-2xl">Scheduler</h1>
                        </Link>
                        <p className="text-slate-500 text-sm mt-1">
                            {loginState ? "Sign in to your Dashboard" : "Create your account"}
                        </p>
                        {selectedPlan && <p className="text-red-600 text-sm mt-2">Selected plan: {selectedPlan}</p>}
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-5 text-sm">
                        {error && <p role="alert" className="text-red-700 bg-red-50 rounded-lg p-3">{error}</p>}
                        {!loginState && (
                            <div>
                                <label className="block mb-1.5">Name</label>
                                <div className="relative">
                                    <User2Icon className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input type="text" required placeholder="Enter your name" className="w-full pl-10 pr-4 py-2.5 bg-slate-50 outline-slate-300 border border-slate-200 rounded-full" value={name} onChange={(e) => setName(e.target.value)} />
                                </div>
                            </div>
                        )}
                        <div>
                            <label className="block mb-1.5">Email</label>
                            <div className="relative">
                                <MailIcon className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input type="email" required placeholder="you@company.com" className="w-full pl-10 pr-4 py-2.5 bg-slate-50 outline-slate-300 border border-slate-200 rounded-full" value={email} onChange={(e) => setEmail(e.target.value)} />
                            </div>
                        </div>
                        <div>
                            <label className="block mb-1.5">Password</label>
                            <div className="relative">
                                <LockIcon className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input type="password" required placeholder="********" className="w-full pl-10 pr-4 py-2.5 bg-slate-50 outline-slate-300 border border-slate-200 rounded-full" value={password} onChange={(e) => setPassword(e.target.value)} />
                            </div>
                        </div>

                        <button type="submit" disabled={loading} className="w-full py-2.5 px-4 bg-linear-to-r from-red-600 to-red-500 text-white rounded-full text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                            {loading ? (
                                loginState ? "Signing in..." : "Creating account..."
                            ) : (
                                <>
                                    {loginState ? "Sign In" : "Sign Up"} <ArrowRightIcon className="size-4" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm text-slate-500">
                        {loginState ? (
                            <>
                                Don't have an account?{" "}
                                <button onClick={() => setLoginState(false)} className="text-red-600 hover:text-red-700">
                                    Create one free
                                </button>
                            </>
                        ) : (
                            <>
                                Already have an account?{" "}
                                <button onClick={() => setLoginState(true)} className="text-red-600 hover:text-red-700">
                                    Sign In
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

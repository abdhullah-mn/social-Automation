import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar"
import { useState } from "react";
import { MenuIcon } from "lucide-react";
import { useLocation } from "react-router-dom";

const pageTitles: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/accounts": "Social Accounts",
    "/shedule": "Sheduler",
    "/ai-composer": "AI Composer"
};// This object maps route paths to their corresponding page titles



const Layout = () => {
    
    const location = useLocation();
    const title = pageTitles[location.pathname] || "SocialAI"; // Get the page title based on the current route, default to "Dashboard" if not found

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);    
  return (
    <div className="flex h-screen bg-slate-50">
        
        {/*mobile overlay*/}
        {isMobileMenuOpen && <div className="fixed inset-0 bg-slate-900/50 z-40 md:hidden  " onClick={()=> setIsMobileMenuOpen(false)}/>}

        <Sidebar isOpen={isMobileMenuOpen} setIsOpen={setIsMobileMenuOpen} />
    
    <div className="flex-1 flex flex-col overflow-hidden">
       {/* TopBar */}

       <header className='h-16 bg-white border-b border-slate-200 flex items-center px-4 md:px-8 gap-4'>
           <button className="md:hidden p-2 -ml-2 text-slate-500 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400 rounded" onClick={()=> setIsMobileMenuOpen(true)}>

              <MenuIcon className="size-6" /> 
           </button>

           <div>
             <h1 className="text-slate-900 text-xl font-bold">{title}</h1>
             <p className="text-sm text-slate-400 hidden sm:block">Streamline and Automate Your Social Media Presence</p>
           </div>

       </header>
       <main className="flex-1 overflow-auto p-4 sm:p-6 md:p-8 xl:p-12">
          <Outlet />

       </main>

    </div>

    </div>
  )
}

export default Layout
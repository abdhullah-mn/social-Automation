import { CalendarDaysIcon, LayoutDashboardIcon, LogOutIcon, UserIcon, Wand2Icon } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";


const Sidebar = ({isOpen, setIsOpen} : {isOpen: boolean, setIsOpen: (isOpen: boolean) => void}) => {
    const {logout, user} = {
        logout: ()=>{
            window.location.href = "/";
        },
        user:{
            name: "Abdullah Noufal",
            email:"abdullah.noufal@example.com"
        }

    }
  
  
    const location = useLocation();


  const navigationItems = [
    { name: "Dashboard", icon: LayoutDashboardIcon, path: "/dashboard" },
    { name: "Social Accounts", icon: UserIcon, path: "/accounts" },
    { name: "Sheduler", icon:CalendarDaysIcon, path: "/shedule" },
    { name: "AI Composer", icon: Wand2Icon, path: "/ai-composer" },
  ];

  return (
    <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col h-full transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0 ${isOpen ? "translate-x-0": "-translate-x-full"}`}>
    
    {/*logo*/}
    <div className= "p-6 pb-4">
        <div className="text-xl tracking-tight text-slate-800 flex items-center gap-2 font-bold">
            <img src="/logo.svg" alt="Logo" className="size-6" />
            Sheduler
        </div>

    </div>

    {/*nav items*/}
    <div className="px-6 py-2 ">
        <span className="text-xs text-slate-500 uppercase tracking-wider">Menu</span>
    </div>
    <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
      {navigationItems.map((item) => {
        const isActive = location.pathname === item.path;
        const Icon = item.icon;

        return (

            <NavLink 
             to={item.path}
             key={item.name}
             end={item.path === "/dashboard"}
             onClick={() => setIsOpen(false)}
             className={`flex items-center px-4 py-2 text-sm font-medium rounded-md hover:bg-slate-100 ${isActive ? "bg-red-50 text-red-600 border-red-100" : "text-slate-500 hover:bg-slate-50 border-transparent hover:text-slate-700"}`}>
                <item.icon className={`size-4.5 shrink-0 ${isActive ? "text-red-500" : "text-slate-500"}`}/>
                {item.name}
                {isActive && <span className='ml-auto w-[5px] h-5 rounded-full bg-red-500'/>}
            </NavLink>
        );
      })}
    </nav>

    {/*footer*/}
    <div className= 'p-4 border-t border-slate-100'>
        <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors">
            {/*user avatar*/}
            <div className="size-8 rounded-full bg-linear-to-br from-red-400 to-pink-400 flex items-center justify-center text-white text-sm font-medium shrink-0">
                {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>

            {/*name and email of user displayed in sidebar footer*/}
            <div className="flex-1 min-w-0">

                {/*truncate the name and email if they are too long to fit in the sidebar footer*/}
                <div className="text-sm text-slate-800 truncate">{user?.name}</div>
                <div className="text-xs text-slate-500 truncate">{user?.email}</div>
            </div>
        </div>
        {/*logout button*/}
        <button 
            onClick={logout}
            className="mt-1 w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-slate-500 hover:text-red-500 hover:bg-red-50 transition-all duration-150"
            title="Logout">
            <LogOutIcon className="size-4" />
            SignOut
        </button>


    </div>


    </div>
  )
} 

export default Sidebar
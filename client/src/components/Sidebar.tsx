import { CalendarDaysIcon, LayoutDashboardIcon, UserIcon, Wand2Icon, } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";


const Sidebar = ({isOpen, setIsOpen} : {isOpen: boolean, setIsOpen: (isOpen: boolean) => void}) => {
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
             onClick={() => setIsOpen(false)}>
                <item.icon className={`size-4.5 shrink-0 ${isActive ? "text-red-500" : "text-slate-500"}`}/>
                {item.name}
                {isActive && <span className='ml-auto w-[5px] h-5 rounded-full bg-red-500'/>}
            </NavLink>



  
        );
      })}
    </nav>

    </div>
  )
} 

export default Sidebar
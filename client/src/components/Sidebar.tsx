

const Sidebar = ({isOpen} : {isOpen: boolean}) => {
  return (
    <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col h-full transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0 ${isOpen ? "translate-x-0": "-translate-x-full"}`}>
    
    {/*logo*/}
    <div className= "p-6 pb-4">
        <div className="text-xl tracking-tight text-slate-800 flex items-center gap-2 font-bold">
            <img src="/logo.svg" alt="Logo" className="size-6" />
        </div>

    </div>

    </div>
  )
} 

export default Sidebar
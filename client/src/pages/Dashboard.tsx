import { CheckCircleIcon, Clock, ClockIcon, Share2Icon, TrendingUpDown, UserIcon } from "lucide-react";
import { useState } from "react";

const Dashboard = () => {
  //idea behind this is to show a greeting based on the time of day, and then show some stats about the user's social media accounts. For now, we'll just show the greeting and a placeholder for the stats.
  const hour = new Date().getHours();

  let greeting = "Good Morning";

  if (hour >= 12 && hour < 17) {
    greeting = "Good Afternoon";
  } else if (hour >= 17) {
    greeting = "Good Evening";
  }
const [statsState, setStatsState] = useState({
  scheduled: 0,
  published: 0,
  connectedAccounts: 0
});

const [activities, setActivities] = useState<any[]>([]);

const stats = [
  {
    label: "Scheduled Posts",
    value: statsState.scheduled,
    icon: ClockIcon,
    trend: "+2 today"
  },
  {
    label: "Published Posts",
    value: statsState.published,
    icon: CheckCircleIcon,
    trend: "All time"
  },
  {
    label: "Connected Accounts",
    value: statsState.connectedAccounts,
    icon: Share2Icon,
    trend: "Activity"
  }
];

  return (
    <div className='space-y-8'>

      <div>
        {/*welcomeBar*/}
        <h2 className="text-2xl font-bold">{greeting}</h2>
        <p className="text-slate-500 text-sm mt-0.5">Here's what's happening with your social media accounts today.</p>
      </div>
      {/*stats*/}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white hover:bg-red-50 relative border border-slate-200 rounded-2xl p-5 hover:border-red-500 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-3xl font-medium text-slate-800">
                {stat.value}
              </div>
              <div className="flex items-center gap-1 text-sm text-red-500 absolute right-4 top-4">
                <TrendingUpDown className="size-3"/>
                {stat.trend}
              </div>
            </div>
            <p className="text-slate-500 text-sm mt-2">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Dashboard
import { ActivityIcon, CheckCircleIcon, Clock, ClockIcon, SendIcon, Share2Icon, TrendingUpDown, UserIcon } from "lucide-react";
import { useEffect, useState } from "react";

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

// Dummy data used during development / when API is not available
const dummyPostsData = [
  { id: 1, status: "scheduled" },
  { id: 2, status: "published" },
  { id: 3, status: "scheduled" }
];

const dummyAccountsData = [
  { id: "acc1" },
  { id: "acc2" }
];

const dummyActivities = [
  { _id: "a1", createdAt: new Date().toISOString(), description: "Published post: Welcome to our new app", timestamp: "Just now" },
  { _id: "a2", createdAt: new Date().toISOString(), description: "Scheduled post: New feature announcement", timestamp: "2h ago" }
];

useEffect(()=>{

  const fetchDashboardData = async () => {
    try {
      // Replace the following with real API calls when available
      const [postsRes, accountsRes] = [{data: dummyPostsData}, {data: dummyAccountsData}];
      const posts = postsRes.data;

      setStatsState({
        scheduled: posts.filter((post: any) => post.status === "scheduled").length,
        published: posts.filter((post: any) => post.status === "published").length,
        connectedAccounts: accountsRes.data.length
      });

      setActivities(dummyActivities);

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  };

  fetchDashboardData();

},[])

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

    {/*recent activity feed*/}
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
        <h3 className="text-lg font-medium text-slate-800">Recent Activity</h3>
        <span className="text-sm text-slate-500">{activities.length} events</span>
      </div>

      {activities.length ===0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6">
          <div className="flex flex-col items-center justify-center mb-3 size-12 bg-slate-100 rounded-full mx-auto mt-10"><ActivityIcon className="size-6 text-slate-400" /></div>
          <p className="text-slate-500 text-sm mt-2">No recent activity</p>
          <p className="text-slate-500 text-sm mt-1">Connect Accounts and schedule posts to see activity here.</p>
        </div>
      ):(
        <div>
          {activities.map((activity)=>(
            <div key={activity._id} className="flex items-start gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors">
              <div className="size-9 rounded-xl flex items-center justify-center text-zinc-600 shrink-0 bg-zinc-100 mt-0.5">
                <SendIcon className="size-5 text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className='text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600'>Published</span>
                  <span className="text-xs text-slate-500 shrink-0">{new Date(activity.createdAt).toLocaleDateString()}</span>
                  
                </div>
                <p className="text-slate-800 text-sm">{activity.description}</p>
                <p className="text-slate-500 text-sm">{activity.timestamp}</p>
                
              </div>
            </div>
          ))}
        </div>
      )}

    </div>

    </div>
  )
}

export default Dashboard
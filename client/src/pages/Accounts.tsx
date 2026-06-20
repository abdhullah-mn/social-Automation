import { useEffect, useState } from "react";
import { PLATFORMS } from "../assets/assets";
import { Plus as PlusIcon, X as XIcon, Check as CheckIcon, Trash2 as TrashIcon, Loader2 as LoaderIcon } from "lucide-react";

interface Account {
  id: string;
  platformId: string;
  username: string;
  connectedAt: string;
}

const dummyAccounts: Account[] = [
  {
    id: "acc_twitter",
    platformId: "twitter",
    username: "socialpilot",
    connectedAt: "2026-06-15T08:12:00.000Z",
  },
  {
    id: "acc_linkedin",
    platformId: "linkedin",
    username: "workchamp",
    connectedAt: "2026-06-13T14:25:00.000Z",
  },
];

const Accounts = () => {

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [showPlatformPicker, setShowPlatformPicker] = useState(false);

  useEffect(() => {
    setAccounts(dummyAccounts);
  }, []);

  // Handler to disconnect an account
  const handleDisconnect = (accountId: string) => {
    setAccounts(accounts.filter(acc => acc.id !== accountId));
  };

  const handleConnectPlatform = async (platformId: string) => {
    setConnecting(platformId);
    
    // Simulate async connection
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    const newAccount: Account = {
      id: `acc_${Date.now()}`,
      platformId,
      username: `user_${platformId}`,
      connectedAt: new Date().toISOString()
    };
    
    setAccounts([...accounts, newAccount]);
    setConnecting(null);
    setShowPlatformPicker(false);
  };

  const connectedPlatformIds = accounts.map(acc => acc.platformId);
  const availablePlatforms = PLATFORMS.filter(p => !connectedPlatformIds.includes(p.id));

  return (
    <div className='space-y-8 max-w-4xl mx-auto p-4'>
        {/*welcomeBar*/}
        <div className="flex items-center justify-between flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div>
          <h2 className="text-xl text-slate-900">Connected Accounts</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            {accounts.length} of {PLATFORMS.length} accounts connected
          </p>
        </div>
        <button className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 rounded bg-red-500 text-black hover:bg-red-600 transition-colors" onClick={()=>setShowPlatformPicker(true)}>
          <PlusIcon className="w-4 h-4" />
          Connect New Account
        </button>
        </div>

        {/* Empty State */}
        {accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="flex flex-col items-center justify-center mb-4 size-16 bg-slate-100 rounded-full mx-auto">
              <PlusIcon className="size-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-800 mt-2">No accounts connected yet</h3>
            <p className="text-slate-500 text-sm mt-1 text-center">
              Connect your social media accounts to start scheduling posts
            </p>
            <button 
              onClick={() => setShowPlatformPicker(true)}
              className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
            >
              Connect First Account
            </button>
          </div>
        ) : (
          /* Connected Accounts Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {accounts.map((account) => {
              const platform = PLATFORMS.find(p => p.id === account.platformId);
              const Icon = platform?.icon;
              
              return (
                <div
                  key={account.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {Icon && (
                        <div className="size-12 flex items-center justify-center bg-slate-100 rounded-lg text-slate-600">
                          <Icon className="size-6" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-medium text-slate-800">{platform?.name}</h3>
                        <p className="text-sm text-slate-500">@{account.username}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDisconnect(account.id)}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-red-500"
                      title="Disconnect account"
                    >
                      <TrashIcon className="size-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">
                      <CheckIcon className="size-3" />
                      Connected
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(account.connectedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Platform Picker Modal */}
        {showPlatformPicker && (
          //here we  add a modal for platform selection and background blur
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-96 overflow-auto">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-200 sticky top-0 bg-white">
                <h2 className="text-lg font-semibold text-slate-900">Connect New Account</h2>
                <button
                  onClick={() => setShowPlatformPicker(false)}
                  className="p-1 hover:bg-slate-100 rounded transition-colors"
                >
                  <XIcon className="size-5 text-slate-500" />
                </button>
              </div>

              {/* Platform List */}
              <div className="p-4 space-y-2">
                {availablePlatforms.length > 0 ? (
                  availablePlatforms.map((platform) => {
                    const Icon = platform.icon;
                    const isConnecting = connecting === platform.id;
                    
                    return (
                      <button
                        key={platform.id}
                        onClick={() => !isConnecting && handleConnectPlatform(platform.id)}
                        disabled={isConnecting}
                        className="w-full flex items-center gap-3 p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-left"
                      >
                        <div className="size-10 flex items-center justify-center bg-slate-100 rounded-lg text-slate-600 flex-shrink-0">
                          {isConnecting ? (
                            <LoaderIcon className="size-5 animate-spin text-red-500" />
                          ) : (
                            <Icon className="size-5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900">{platform.name}</p>
                          <p className="text-xs text-slate-500">{platform.description}</p>
                        </div>
                        {isConnecting && (
                          <span className="text-xs text-slate-500">Connecting...</span>
                        )}
                      </button>
                    );
                  })
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-slate-500 text-sm">All platforms are already connected!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
    </div>
  )
}

export default Accounts
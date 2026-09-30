import type { Response } from 'express'
import type { AuthRequest } from '../middleware/requireAuth.js'
import { authConfig } from '../config/auth.js'
import { Account } from '../models/Account.js'
import User from '../models/User.js'
import { HttpError, ProviderError, zernio } from '../config/zernio.js'
import { accountPayload, ensureProfile, platforms, syncUserAccounts } from '../services/accounts.js'

export async function generateAuthUrl(req: AuthRequest, res: Response) {
  const platform = req.params.platform
  if (typeof platform !== 'string' || !platforms.includes(platform)) throw new HttpError(400, 'Unsupported platform')
  const profileId = await ensureProfile(req.user!.id)
  const { authUrl } = await zernio.connect(platform, profileId, `${authConfig().origin}/accounts?connection=returned`)
  if (typeof authUrl !== 'string' || !authUrl.startsWith('https://')) throw new HttpError(502, 'Invalid authorization URL')
  res.json({ authUrl })
}

export async function syncAccounts(req: AuthRequest, res: Response) {
  res.json({ accounts: (await syncUserAccounts(req.user!.id)).map(accountPayload) })
}

export async function getConnectedAccounts(req: AuthRequest, res: Response) {
  const user = await User.findById(req.user!.id)
  if (!user) throw new HttpError(401, 'User no longer exists')
  if (user.zernioBindingVersion !== 1 || !user.zernioProfileId) return void res.json({ accounts: [] })
  const accounts = await Account.find({ user: req.user!.id, profileId: user.zernioProfileId }).sort({ createdAt: -1 })
  res.json({ accounts: accounts.map(accountPayload) })
}

export async function disconnectAccount(req: AuthRequest, res: Response) {
  if (typeof req.params.accountId !== 'string' || !/^[a-f\d]{24}$/i.test(req.params.accountId)) throw new HttpError(404, 'Account not found')
  const account = await Account.findOne({ _id: req.params.accountId, user: req.user!.id })
  if (!account) throw new HttpError(404, 'Account not found')
  const profileId = await ensureProfile(req.user!.id)
  if (account.profileId !== profileId) throw new HttpError(409, 'Reconnect this legacy account before managing it')
  // Check provider membership immediately before deleting via a team-wide key.
  const remote = (await zernio.accounts(profileId)).accounts
  if (remote.some((a) => a._id === account.zernioAccountId &&
    (typeof a.profileId === 'string' ? a.profileId : a.profileId?._id) === profileId)) {
    try { await zernio.disconnect(account.zernioAccountId) }
    catch (error) { if (!(error instanceof ProviderError) || error.providerStatus !== 404) throw error }
  }
  account.status = 'Disconnected'
  await account.save()
  res.json({ account: accountPayload(account) })
}

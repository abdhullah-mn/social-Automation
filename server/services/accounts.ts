import User from '../models/User.js'
import { Account } from '../models/Account.js'
import { HttpError, ProviderError, zernio } from '../config/zernio.js'

export const platforms = ['twitter', 'linkedin', 'facebook', 'instagram']
export const providerId = (value: string | { _id: string }) => typeof value === 'string' ? value : value?._id

export async function ensureProfile(userId: string) {
  const user = await User.findById(userId)
  if (!user) throw new HttpError(401, 'User no longer exists')
  if (user.zernioBindingVersion === 1 && user.zernioProfileId) return user.zernioProfileId
  // Never trust legacy mappings that may refer to the shared Default profile.
  const name = `social_automation_user_${userId}`
  const listed = await zernio.profiles()
  if (!Array.isArray(listed.profiles)) throw new HttpError(502, 'Invalid profile response')
  let id = listed.profiles.find((profile) => profile.name === name)?._id
  if (!id) {
    try { id = (await zernio.createProfile(name)).profile?._id }
    catch (error) {
      // The deterministic name also resolves concurrent first connections.
      if (!(error instanceof ProviderError) || error.providerStatus !== 409) throw error
      id = (await zernio.profiles()).profiles.find((profile) => profile.name === name)?._id
      if (!id) throw error
    }
  }
  if (!id) throw new HttpError(502, 'Could not create social profile')
  await User.updateOne({ _id: userId }, { $set: { zernioProfileId: id, zernioBindingVersion: 1 } })
  return id
}

export async function syncUserAccounts(userId: string) {
  const profileId = await ensureProfile(userId)
  const result = await zernio.accounts(profileId)
  if (!Array.isArray(result.accounts) || result.accounts.some((account) => providerId(account.profileId) !== profileId)) {
    throw new HttpError(502, 'Provider returned accounts outside the expected profile')
  }
  const supported = result.accounts.filter((account) => platforms.includes(account.platform))
  for (const account of supported) {
    if (!account._id) throw new HttpError(502, 'Invalid account response')
    // Ownership is in the upsert filter. The unique provider ID prevents reassignment.
    await Account.findOneAndUpdate({ user: userId, zernioAccountId: account._id }, { $set: {
      platform: account.platform, handle: account.username || account.displayName || account._id,
      profileId, status: account.isActive ? 'Connected' : 'Disconnected', avatarUrl: account.profilePicture,
    }, $unset: { accessToken: '', refreshToken: '', tokenExpiresAt: '' } }, { upsert: true, returnDocument: 'after', runValidators: true })
  }
  await Account.updateMany({ user: userId, zernioAccountId: { $nin: supported.map((a) => a._id) } },
    { $set: { status: 'Disconnected' } })
  return Account.find({ user: userId, profileId }).sort({ createdAt: -1 })
}

export function accountPayload(account: InstanceType<typeof Account>) {
  return { id: account._id.toString(), platformId: account.platform, username: account.handle,
    status: account.status, connectedAt: account.createdAt, avatarUrl: account.avatarUrl }
}

export async function ownedAccounts(userId: string, ids: string[]) {
  if (!ids.length || ids.some((id) => !/^[a-f\d]{24}$/i.test(id)) || new Set(ids).size !== ids.length) {
    throw new HttpError(400, 'Select valid connected accounts')
  }
  // Refresh connection health and verify provider membership before any publish.
  await syncUserAccounts(userId)
  const accounts = await Account.find({ user: userId, _id: { $in: ids }, status: 'Connected' })
  if (accounts.length !== ids.length) throw new HttpError(403, 'One or more accounts are disconnected or do not belong to you')
  return accounts
}

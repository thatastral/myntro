'use client'

import { useState, useCallback } from 'react'
import { X, Globe, Lock, Wallet, Trash2, Loader2, AlertTriangle, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User } from '@/types'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
  user: User
  walletAddress?: string | null
  onProfileUpdate: (updates: Partial<User>) => Promise<void>
  onWalletDisconnect?: () => void
}

export function SettingsModal({
  open,
  onClose,
  user,
  walletAddress,
  onProfileUpdate,
  onWalletDisconnect,
}: SettingsModalProps) {
  const router = useRouter()
  const [visibilityLoading, setVisibilityLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [disconnectLoading, setDisconnectLoading] = useState(false)
  const [signOutLoading, setSignOutLoading] = useState(false)

  const toggleVisibility = useCallback(async () => {
    setVisibilityLoading(true)
    try {
      await onProfileUpdate({
        profile_visibility:
          user.profile_visibility === 'public' ? 'private' : 'public',
      })
    } finally {
      setVisibilityLoading(false)
    }
  }, [user.profile_visibility, onProfileUpdate])

  const handleDisconnectWallet = useCallback(async () => {
    if (!walletAddress) return
    setDisconnectLoading(true)
    try {
      await fetch('/api/wallets', { method: 'DELETE' })
      onWalletDisconnect?.()
    } finally {
      setDisconnectLoading(false)
    }
  }, [walletAddress, onWalletDisconnect])

  const handleDeleteAccount = useCallback(async () => {
    if (deleteConfirm !== user.username) return

    setDeleteLoading(true)
    setDeleteError(null)

    try {
      const supabase = createClient()

      // Delete user data (RLS cascades, but explicit cleanup)
      await Promise.all([
        supabase.from('links').delete().eq('user_id', user.id),
        supabase.from('achievements').delete().eq('user_id', user.id),
        supabase.from('affiliations').delete().eq('user_id', user.id),
        supabase.from('wallets').delete().eq('user_id', user.id),
        supabase.from('embeddings').delete().eq('user_id', user.id),
        supabase.from('documents').delete().eq('user_id', user.id),
      ])

      await supabase.from('users').delete().eq('id', user.id)

      // Sign out and redirect
      await supabase.auth.signOut()
      router.push('/')
    } catch (err: unknown) {
      setDeleteError(
        err instanceof Error ? err.message : 'Failed to delete account. Please contact support.',
      )
      setDeleteLoading(false)
    }
  }, [deleteConfirm, user.id, user.username, router])

  const handleSignOut = useCallback(async () => {
    setSignOutLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }, [router])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-50">Settings</h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800">
          {/* Profile visibility */}
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              {user.profile_visibility === 'public' ? (
                <Globe className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              ) : (
                <Lock className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              )}
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-50">
                  Profile visibility
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {user.profile_visibility === 'public'
                    ? 'Anyone can view your profile'
                    : 'Only you can view your profile'}
                </p>
              </div>
            </div>

            <button
              onClick={toggleVisibility}
              disabled={visibilityLoading}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
                user.profile_visibility === 'public'
                  ? 'bg-gray-900 dark:bg-gray-100'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
                  user.profile_visibility === 'public' ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Wallet */}
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <Wallet className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-50">
                  Connected wallet
                </p>
                <p className="font-mono text-xs text-gray-500 dark:text-gray-400">
                  {walletAddress
                    ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`
                    : 'No wallet connected'}
                </p>
              </div>
            </div>

            {walletAddress && (
              <button
                onClick={handleDisconnectWallet}
                disabled={disconnectLoading}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:border-gray-700 dark:text-gray-400 dark:hover:border-red-900 dark:hover:bg-red-950/20 dark:hover:text-red-400"
              >
                {disconnectLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : null}
                Disconnect
              </button>
            )}
          </div>

          {/* Sign out */}
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <LogOut className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-50">Sign out</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              disabled={signOutLoading}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              {signOutLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Sign out
            </button>
          </div>

          {/* Delete account */}
          <div className="px-5 py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-500" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-50">
                  Delete account
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  This action is permanent and cannot be undone.
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-2">
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder={`Type "${user.username}" to confirm`}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:border-red-300 focus:bg-white dark:border-gray-700 dark:bg-gray-800 dark:text-gray-50 dark:placeholder-gray-500"
              />

              {deleteError && (
                <p className="text-xs text-red-600 dark:text-red-400">{deleteError}</p>
              )}

              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirm !== user.username || deleteLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {deleteLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                {deleteLoading ? 'Deleting…' : 'Permanently delete my account'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

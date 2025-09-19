'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PayCycle, User } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { fetchCompanyUsers, fetchUsersByPayCycle, setAssignmentsForPayCycle, subscribeAssignments } from '@/lib/payCycles'

interface PayCycleManagerModalProps {
  isOpen: boolean
  onClose: () => void
  companyId: string
  payCycle: PayCycle
}

const DUMMY_USERS: User[] = [
  { id: '1', name: 'Alice Johnson', email: 'alice@example.com', role: 'employee' },
  { id: '2', name: 'Bob Smith', email: 'bob@example.com', role: 'employee' },
  { id: '3', name: 'Charlie Davis', email: 'charlie@example.com', role: 'employee' },
  { id: '4', name: 'Diana Roberts', email: 'diana@example.com', role: 'employee' },
  { id: '5', name: 'Ethan Brown', email: 'ethan@example.com', role: 'employee' },
]

function avatarFor(name: string) {
  const initials = name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold">
      {initials}
    </div>
  )
}

export default function PayCycleManagerModal({ isOpen, onClose, companyId, payCycle }: PayCycleManagerModalProps) {
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [assignedUsers, setAssignedUsers] = useState<User[]>([])
  const [searchLeft, setSearchLeft] = useState('')
  const [searchRight, setSearchRight] = useState('')
  const [leftSelected, setLeftSelected] = useState<Set<string>>(new Set())
  const [rightSelected, setRightSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dragOverLeft, setDragOverLeft] = useState(false)
  const [dragOverRight, setDragOverRight] = useState(false)

  // Load users and preassign
  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    Promise.all([
      fetchCompanyUsers(companyId).catch(() => DUMMY_USERS),
      fetchUsersByPayCycle(companyId, payCycle).catch(() => DUMMY_USERS.slice(0, 2)),
    ])
      .then(([all, assigned]) => {
        // Ensure uniqueness by id and align shapes
        const allMap = new Map(all.map(u => [u.id, u]))
        setAllUsers(Array.from(allMap.values()))
        const assignedMap = new Map(assigned.map(u => [u.id, u]))
        setAssignedUsers(Array.from(assignedMap.values()))
        setLeftSelected(new Set())
        setRightSelected(new Set())
      })
      .finally(() => setLoading(false))
  }, [isOpen, companyId, payCycle])

  // Realtime refresh
  useEffect(() => {
    if (!isOpen) return
    const unsub = subscribeAssignments(companyId, () => {
      // Refresh assigned users only
      fetchUsersByPayCycle(companyId, payCycle)
        .then(setAssignedUsers)
        .catch(() => {})
    })
    return () => unsub?.()
  }, [isOpen, companyId, payCycle])

  const remainingUsers = useMemo(() => {
    const assignedIds = new Set(assignedUsers.map(u => u.id))
    const pool = allUsers.filter(u => !assignedIds.has(u.id))
    const q = searchLeft.trim().toLowerCase()
    if (!q) return pool
    return pool.filter(u => u.name.toLowerCase().includes(q) || (u.email?.toLowerCase().includes(q)))
  }, [allUsers, assignedUsers, searchLeft])

  const filteredAssigned = useMemo(() => {
    const q = searchRight.trim().toLowerCase()
    if (!q) return assignedUsers
    return assignedUsers.filter(u => u.name.toLowerCase().includes(q) || (u.email?.toLowerCase().includes(q)))
  }, [assignedUsers, searchRight])

  const moveLeftToRight = useCallback((ids: string[]) => {
    const idSet = new Set(ids)
    const toMove = remainingUsers.filter(u => idSet.has(u.id))
    setAssignedUsers(prev => [...prev, ...toMove])
    setLeftSelected(new Set())
  }, [remainingUsers])

  const moveRightToLeft = useCallback((ids: string[]) => {
    const idSet = new Set(ids)
    setAssignedUsers(prev => prev.filter(u => !idSet.has(u.id)))
    setRightSelected(new Set())
  }, [])

  // Drag and drop handlers
  const dragDataKey = 'text/x-user-ids'
  const handleDragStart = (e: React.DragEvent, ids: string[]) => {
    e.dataTransfer.setData(dragDataKey, JSON.stringify(ids))
    e.dataTransfer.effectAllowed = 'move'
  }
  const handleDropLeft = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOverLeft(false)
    const payload = e.dataTransfer.getData(dragDataKey)
    if (!payload) return
    const ids: string[] = JSON.parse(payload)
    moveRightToLeft(ids)
  }
  const handleDropRight = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOverRight(false)
    const payload = e.dataTransfer.getData(dragDataKey)
    if (!payload) return
    const ids: string[] = JSON.parse(payload)
    moveLeftToRight(ids)
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const toggleLeft = (id: string, multi: boolean) => {
    setLeftSelected(prev => {
      const next = new Set(prev)
      if (!multi) return next.has(id) ? new Set([id]) : new Set([id])
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  const toggleRight = (id: string, multi: boolean) => {
    setRightSelected(prev => {
      const next = new Set(prev)
      if (!multi) return next.has(id) ? new Set([id]) : new Set([id])
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const startDragLeft = (e: React.DragEvent, id: string) => {
    const ids = leftSelected.size > 0 && leftSelected.has(id) ? Array.from(leftSelected) : [id]
    handleDragStart(e, ids)
  }
  const startDragRight = (e: React.DragEvent, id: string) => {
    const ids = rightSelected.size > 0 && rightSelected.has(id) ? Array.from(rightSelected) : [id]
    handleDragStart(e, ids)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const ids = assignedUsers.map(u => u.id)
      await setAssignmentsForPayCycle(companyId, payCycle, ids)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-5xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Manage {payCycle} Pay Cycle</CardTitle>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: Remaining Users */}
            <div
              onDragOver={onDragOver}
              onDrop={handleDropLeft}
              onDragEnter={() => setDragOverLeft(true)}
              onDragLeave={() => setDragOverLeft(false)}
              className={`border rounded-md ${dragOverLeft ? 'ring-2 ring-blue-300 bg-blue-50' : ''}`}
            >
              <div className="px-3 py-2 border-b bg-gray-50 flex items-center justify-between">
                <div className="text-sm font-medium">Remaining Users</div>
                <input
                  value={searchLeft}
                  onChange={e => setSearchLeft(e.target.value)}
                  placeholder="Search"
                  className="ml-2 px-2 py-1 border rounded-md text-sm"
                />
              </div>
              <div className="max-h-80 overflow-auto">
                {loading ? (
                  <div className="p-4 text-sm text-gray-600">Loading…</div>
                ) : remainingUsers.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500">No users</div>
                ) : (
                  <ul className="divide-y">
                    {remainingUsers.map(u => {
                      const selected = leftSelected.has(u.id)
                      return (
                        <li
                          key={u.id}
                          draggable
                          onDragStart={(e) => startDragLeft(e, u.id)}
                          onClick={(e) => toggleLeft(u.id, e.ctrlKey || e.metaKey)}
                          className={`px-3 py-2 flex items-center gap-3 cursor-move hover:bg-gray-50 ${selected ? 'bg-blue-50' : ''}`}
                        >
                          {avatarFor(u.name)}
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium truncate">{u.name}</div>
                            <div className="text-xs text-gray-500 truncate">{u.email}</div>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </div>

            {/* Right: Assigned Users */}
            <div
              onDragOver={onDragOver}
              onDrop={handleDropRight}
              onDragEnter={() => setDragOverRight(true)}
              onDragLeave={() => setDragOverRight(false)}
              className={`border rounded-md ${dragOverRight ? 'ring-2 ring-blue-300 bg-blue-50' : ''}`}
            >
              <div className="px-3 py-2 border-b bg-gray-50 flex items-center justify-between">
                <div className="text-sm font-medium">Users in This Pay Cycle</div>
                <input
                  value={searchRight}
                  onChange={e => setSearchRight(e.target.value)}
                  placeholder="Search"
                  className="ml-2 px-2 py-1 border rounded-md text-sm"
                />
              </div>
              <div className="max-h-80 overflow-auto">
                {loading ? (
                  <div className="p-4 text-sm text-gray-600">Loading…</div>
                ) : filteredAssigned.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500">No users</div>
                ) : (
                  <ul className="divide-y">
                    {filteredAssigned.map(u => {
                      const selected = rightSelected.has(u.id)
                      return (
                        <li
                          key={u.id}
                          draggable
                          onDragStart={(e) => startDragRight(e, u.id)}
                          onClick={(e) => toggleRight(u.id, e.ctrlKey || e.metaKey)}
                          className={`px-3 py-2 flex items-center gap-3 cursor-move hover:bg-gray-50 ${selected ? 'bg-blue-50' : ''}`}
                        >
                          {avatarFor(u.name)}
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium truncate">{u.name}</div>
                            <div className="text-xs text-gray-500 truncate">{u.email}</div>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}



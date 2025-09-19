'use client'

import { supabase } from './supabaseClient'
import { PayCycle, PayCycleAssignment, User } from '@/types'

export async function fetchCompanyUsers(companyId: string): Promise<User[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('company_id', companyId)
    .order('name', { ascending: true })
  if (error) throw error
  return (data || []).map((u: any) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    department: u.department ?? undefined,
    managerId: u.manager_id ?? undefined,
    avatar: u.avatar ?? undefined,
    companyId: u.company_id ?? undefined,
  }))
}

export async function fetchAssignments(companyId: string): Promise<PayCycleAssignment[]> {
  const { data, error } = await supabase
    .from('pay_cycle_assignments')
    .select('*')
    .eq('company_id', companyId)
  if (error) throw error
  return (data || []).map((r: any) => ({
    id: r.id,
    userId: r.user_id,
    companyId: r.company_id,
    payCycle: r.pay_cycle as PayCycle,
    createdAt: r.created_at ?? undefined,
  }))
}

export async function fetchUsersByPayCycle(companyId: string, payCycle: PayCycle): Promise<User[]> {
  const { data, error } = await supabase
    .from('pay_cycle_assignments')
    .select('user:users(*)')
    .eq('company_id', companyId)
    .eq('pay_cycle', payCycle)
  if (error) throw error
  const rows = data || []
  return rows
    .map((row: any) => row.user)
    .filter(Boolean)
    .map((u: any) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      department: u.department ?? undefined,
      managerId: u.manager_id ?? undefined,
      avatar: u.avatar ?? undefined,
      companyId: u.company_id ?? undefined,
    }))
}

export async function setAssignmentsForPayCycle(companyId: string, payCycle: PayCycle, desiredUserIds: string[]) {
  // Fetch current assignments
  const { data: current, error: fetchErr } = await supabase
    .from('pay_cycle_assignments')
    .select('id,user_id')
    .eq('company_id', companyId)
    .eq('pay_cycle', payCycle)
  if (fetchErr) throw fetchErr
  const currentUserIds = new Set((current || []).map((r: any) => r.user_id as string))

  const desiredSet = new Set(desiredUserIds)
  const toInsert = desiredUserIds.filter(id => !currentUserIds.has(id))
  const toDeleteIds = (current || [])
    .filter((r: any) => !desiredSet.has(r.user_id))
    .map((r: any) => r.id as string)

  if (toInsert.length > 0) {
    const { error: insertErr } = await supabase
      .from('pay_cycle_assignments')
      .insert(toInsert.map(userId => ({
        user_id: userId,
        company_id: companyId,
        pay_cycle: payCycle,
      })))
    if (insertErr) throw insertErr
  }

  if (toDeleteIds.length > 0) {
    const { error: deleteErr } = await supabase
      .from('pay_cycle_assignments')
      .delete()
      .in('id', toDeleteIds)
    if (deleteErr) throw deleteErr
  }

  return { inserted: toInsert.length, deleted: toDeleteIds.length }
}

export function subscribeAssignments(companyId: string, onChange: () => void) {
  const channel = supabase
    .channel(`pay-cycles:${companyId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'pay_cycle_assignments', filter: `company_id=eq.${companyId}` },
      () => onChange()
    )
    .subscribe()
  return () => {
    supabase.removeChannel(channel)
  }
}



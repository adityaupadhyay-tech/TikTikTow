'use client'

import { supabase } from './supabaseClient'
import { Company } from '@/types'

export async function fetchCompanies(): Promise<Company[]> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .order('name', { ascending: true })
  if (error) throw error
  return (data || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    description: c.description ?? undefined,
    logo: c.logo ?? undefined,
    color: c.color ?? undefined,
    isActive: Boolean(c.is_active ?? true),
  }))
}



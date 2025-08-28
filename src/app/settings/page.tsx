'use client'

import { useState } from 'react'
import Layout from '@/components/Layout'
import ComingSoon from '@/components/ComingSoon'
import { UserRole } from '@/types'
import SettingsIcon from '@mui/icons-material/Settings'

export default function SettingsPage() {
  // TODO: Get user data from authentication context/API
  const [currentUser] = useState({
    name: 'John Doe',
    role: 'admin' as UserRole,
    email: 'john.doe@company.com'
  })

  return (
    <Layout userRole={currentUser.role} userName={currentUser.name}>
      <ComingSoon 
        title="System Settings"
        subtitle="Configure system preferences, manage integrations, and customize application settings. This feature will include user preferences, system configuration, and integration management."
        icon={<SettingsIcon sx={{ fontSize: 80 }} />}
      />
    </Layout>
  )
}

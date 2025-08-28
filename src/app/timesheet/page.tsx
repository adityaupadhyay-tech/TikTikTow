'use client'

import { useState } from 'react'
import Layout from '@/components/Layout'
import ComingSoon from '@/components/ComingSoon'
import { UserRole } from '@/types'
import ScheduleIcon from '@mui/icons-material/Schedule'

export default function TimesheetPage() {
  // TODO: Get user data from authentication context/API
  const [currentUser] = useState({
    name: 'John Doe',
    role: 'admin' as UserRole, // Using same role as dashboard for consistency
    email: 'john.doe@company.com'
  })

  return (
    <Layout userRole={currentUser.role} userName={currentUser.name}>
      <ComingSoon 
        title="Timesheet Management"
        subtitle="Track your work hours, log time entries, and manage your timesheets. This feature will include time tracking, project assignment, and detailed reporting."
        icon={<ScheduleIcon sx={{ fontSize: 80 }} />}
      />
    </Layout>
  )
}

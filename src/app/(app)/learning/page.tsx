
'use client';

import type { User } from '@/lib/types';
import AuditorLearningView from './auditor-view';
import CustomerLearningView from './customer-view';

export default function LearningPage({ userRole }: { userRole: User['role'] }) {
  if (userRole === 'customer') {
    return <CustomerLearningView />;
  }
  
  return <AuditorLearningView />;
}

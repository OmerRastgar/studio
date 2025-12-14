// import type { Timestamp } from 'firebase/firestore';

export interface ProjectModel {
  id: string;
  name: string;
  customerName: string;
  createdAt: string | Date; // was Timestamp
}

// Other models will be added here as we migrate more data

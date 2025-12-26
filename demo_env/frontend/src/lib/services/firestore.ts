// src/lib/services/firestore.ts
// import { db } from '@/lib/firebase';
/* import {
  collection,
  getDocs,
  doc,
  setDoc,
  Timestamp,
} from 'firebase/firestore'; */
import type { ProjectModel } from '@/lib/models';
import type { Project } from '@/lib/types';

// --- Projects ---

// const projectsCollection = collection(db, 'projects');

export async function getProjects(): Promise<Project[]> {
  // const snapshot = await getDocs(projectsCollection);
  return []; /* snapshot.docs.map(doc => {
    const data = doc.data() as ProjectModel;
    return {
      id: doc.id,
      name: data.name,
      customerName: data.customerName,
    };
  }); */
}

export async function addProject(project: Omit<Project, 'id'>): Promise<string> {
  // const newDocRef = doc(projectsCollection);
  const newDocRefId = 'mock-id-' + Date.now();
  /* const newProject: ProjectModel = {
      ...project,
      id: newDocRef.id,
      createdAt: Timestamp.now()
  } 
  await setDoc(newDocRef, newProject);*/
  return newDocRefId;
}

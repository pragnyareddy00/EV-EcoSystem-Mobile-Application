import { collection, doc, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

// List of email addresses that should have admin role
const ADMIN_EMAILS = [
  'abhinavnarahari123@gmail.com', // Add the email addresses of users you want to make admin
];

async function updateUserRoles() {
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);

    for (const userDoc of snapshot.docs) {
      const userData = userDoc.data();
      const isAdmin = ADMIN_EMAILS.includes(userData.email);
      
      // Only update if role is not set
      if (!userData.role) {
        await updateDoc(doc(db, 'users', userDoc.id), {
          role: isAdmin ? 'admin' : 'user'
        });
        console.log(`Updated role for user ${userData.email} to ${isAdmin ? 'admin' : 'user'}`);
      }
    }
    
    console.log('Finished updating user roles');
  } catch (error) {
    console.error('Error updating user roles:', error);
  }
}

// Run the update function
updateUserRoles();
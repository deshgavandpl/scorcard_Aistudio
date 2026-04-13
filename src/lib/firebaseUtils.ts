import { auth } from '../firebase';
import { toast } from 'sonner';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }

  // Display user-friendly toast
  let displayMessage = "An error occurred while accessing the database.";
  let isSpecificError = false;
  
  if (errorMessage.includes("permission-denied") || errorMessage.includes("insufficient permissions")) {
    displayMessage = "Access Denied: You don't have permission to perform this action.";
    isSpecificError = true;
  } else if (errorMessage.includes("unavailable")) {
    displayMessage = "The database is currently unavailable. Please check your internet connection.";
    isSpecificError = true;
  } else if (errorMessage.includes("quota-exceeded")) {
    displayMessage = "Database quota exceeded. Please try again later.";
    isSpecificError = true;
  } else if (errorMessage.includes("index")) {
    displayMessage = "A database index is required for this query. Please contact the administrator.";
    isSpecificError = true;
  }

  toast.error(displayMessage, {
    description: isSpecificError ? `Operation: ${operationType} on ${path || 'unknown path'}` : errorMessage,
    duration: 10000,
  });

  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

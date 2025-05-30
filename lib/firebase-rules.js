// Firebase Security Rules
// Copy these rules to your Firebase console: https://console.firebase.google.com/
// Go to Firestore Database > Rules tab and replace with these rules

/*
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isUserWithRole(role) {
      let userDoc = get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
      return userDoc.userType == role;
    }
    
    function isDonor() {
      return isUserWithRole('Donor');
    }
    
    function isOrphanage() {
      return isUserWithRole('Orphanage');
    }
    
    function isOwner(userId) {
      return request.auth.uid == userId;
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow write: if isOwner(userId);
    }
    
    // Requests collection
    match /requests/{requestId} {
      // Anyone can read requests
      allow read: if isAuthenticated();
      
      // Only orphanages can create requests
      allow create: if isOrphanage() && request.resource.data.orphanageId == request.auth.uid;
      
      // Orphanages can update/delete their own requests
      allow update, delete: if isOrphanage() && resource.data.orphanageId == request.auth.uid;
      
      // Allow donors to update only the donations array field
      allow update: if isDonor() && 
                     request.resource.data.diff(resource.data).affectedKeys().hasOnly(['donations']);
    }
    
    // Donations collection
    match /donations/{donationId} {
      // Anyone authenticated can read donations
      allow read: if isAuthenticated();
      
      // Donors can create donations
      allow create: if isDonor() && request.resource.data.donorId == request.auth.uid;
      
      // Donors can update/delete their own donations
      allow update, delete: if isDonor() && resource.data.donorId == request.auth.uid;
      
      // Orphanages can update donations made to them (to confirm them)
      allow update: if isOrphanage() && resource.data.orphanageId == request.auth.uid;
    }
    
    // Services collection
    match /services/{serviceId} {
      allow read: if isAuthenticated();
      allow create: if isOrphanage() && request.resource.data.orphanageId == request.auth.uid;
      allow update, delete: if isOrphanage() && resource.data.orphanageId == request.auth.uid;
    }
    
    // Fundraisers collection
    match /fundraisers/{fundraiserId} {
      allow read: if isAuthenticated();
      allow create: if isOrphanage() && request.resource.data.orphanageId == request.auth.uid;
      allow update, delete: if isOrphanage() && resource.data.orphanageId == request.auth.uid;
    }
    
    // Chats collection
    match /chats/{chatId} {
      // Users can read chats they're part of
      allow read: if isAuthenticated() && 
                   resource.data.participants.hasAny([request.auth.uid]);
      
      // Anyone authenticated can create a chat
      allow create: if isAuthenticated() && 
                     request.resource.data.participants.hasAny([request.auth.uid]);
      
      // Users can update chats they're part of
      allow update: if isAuthenticated() && 
                     resource.data.participants.hasAny([request.auth.uid]);
      
      // Messages subcollection
      match /messages/{messageId} {
        allow read: if isAuthenticated() && 
                     get(/databases/$(database)/documents/chats/$(chatId)).data.participants.hasAny([request.auth.uid]);
        
        allow create: if isAuthenticated() && 
                       get(/databases/$(database)/documents/chats/$(chatId)).data.participants.hasAny([request.auth.uid]) &&
                       request.resource.data.senderId == request.auth.uid;
        
        allow update: if isAuthenticated() && 
                       get(/databases/$(database)/documents/chats/$(chatId)).data.participants.hasAny([request.auth.uid]);
      }
    }
  }
}
*/

// This file is for reference only. Copy the rules above to your Firebase console.
// The rules are commented out to prevent them from being executed in your application.

export const firebaseRulesInfo = {
  description: "Firebase security rules for CareConnect application",
  instructions: "Copy the rules above to your Firebase console's Firestore Rules section",
  url: "https://console.firebase.google.com/",
  lastUpdated: "2023-05-11",
}

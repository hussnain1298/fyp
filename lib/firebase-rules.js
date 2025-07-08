// Firebase Security Rules
// rules_version = '2';
// service cloud.firestore {
//   match /databases/{database}/documents {
//     // Helper function to check if user is admin
//     function isAdmin() {
//       return request.auth != null &&
//              get(/databases/$(database)/documents/users/$(request.auth.uid)).data.userType == "admin";
//     }

//     // Subscriptions: Allow anyone to create a subscription
//     match /subscriptions/{subscriberId} {
//       allow create: if true;
//       allow read: if isAdmin() || true;
//     }

//     // Donations: Only authenticated users can create/delete donations
//     match /donations/{donationId} {
//       allow create: if request.auth != null;
//       allow update: if request.auth != null && (
//         request.auth.uid == resource.data.orphanageId ||
//         request.auth.uid == resource.data.donorId
//       );
//       allow read: if true; // Public read access allowed
//       allow delete: if request.auth != null && (
//         request.auth.uid == resource.data.orphanageId ||
//         request.auth.uid == resource.data.donorId ||
//         isAdmin()
//       );
//     }

//     // Users: Public read for Orphanage and Donor user types, own read/write for authenticated users
//     match /users/{userId} {
//       allow read: if true;
//       allow write: if request.auth != null && request.auth.uid == userId;
//       allow delete: if isAdmin();
//     }

//     // Requests: Authenticated reads; only orphanage owner can create/update/delete
//   match /requests/{requestId} {
//   allow read: if true;

//   // Allow orphanage to create or update any field
//   allow create, update: if request.auth != null && request.resource.data.orphanageId == request.auth.uid;

//   // Allow donors to only append donation IDs
//   allow update: if request.auth != null &&
//     request.resource.data.diff(resource.data).changedKeys().hasOnly(["donations"]);

//   allow delete: if request.auth != null && (
//     request.auth.uid == resource.data.orphanageId || isAdmin()
//   );
// }

//     // Fundraisers: PUBLIC READ ACCESS ADDED
//     match /fundraisers/{fundraiseId} {
//       allow read: if true;
//       allow create: if request.auth != null &&
//         request.resource.data.orphanageId == request.auth.uid;
//       allow update: if request.auth != null && (
//         resource.data.orphanageId == request.auth.uid ||
//         (
//           get(/databases/$(database)/documents/users/$(request.auth.uid)).data.userType == "Donor" &&
//           request.resource.data.diff(resource.data).changedKeys().hasOnly(["raisedAmount"])
//         )
//       );
//       allow delete: if request.auth != null && (
//         resource.data.orphanageId == request.auth.uid ||
//         isAdmin()
//       );

//       match /donations/{donationId} {
//         allow read: if true;
//         allow create: if request.auth != null &&
//           get(/databases/$(database)/documents/users/$(request.auth.uid)).data.userType == "Donor";
//         allow update: if request.auth != null &&
//           get(/databases/$(database)/documents/users/$(request.auth.uid)).data.userType == "Orphanage";
//       }
//     }

//     // Services: Public read; orphanage owns create/delete; donor can update limited fields for fulfill
//     match /services/{serviceId} {
//       allow read: if true;
//       allow create: if request.auth != null && request.resource.data.orphanageId == request.auth.uid;
//       allow update: if request.auth != null && (
//         request.resource.data.orphanageId == request.auth.uid ||
//         (
//           get(/databases/$(database)/documents/users/$(request.auth.uid)).data.userType == "Donor" &&
//           request.resource.data.diff(resource.data).changedKeys().hasOnly(['status', 'lastFulfillmentNote', 'lastFulfillmentTime']) &&
//           request.resource.data.status == "In Progress"
//         )
//       );
//       allow delete: if request.auth != null && (
//         request.auth.uid == resource.data.orphanageId ||
//         isAdmin()
//       );
//     }

//     // Admin Notifications: Only admins can create, orphanages can read/update their own
//     match /adminNotifications/{notificationId} {
//       allow create: if isAdmin();
//       allow read, update: if request.auth != null && (
//         request.auth.uid == resource.data.orphanageId ||
//         isAdmin()
//       );
//       allow delete: if request.auth != null && (
//         request.auth.uid == resource.data.orphanageId ||
//         isAdmin()
//       );
//     }

//     // Chats: Participants only for create, read, update, delete
//     match /chats/{chatId} {
//       allow create: if request.auth != null
//                     && request.auth.uid in request.resource.data.participants
//                     && request.resource.data.participants.size() >= 2;
//       allow read, update: if request.auth != null
//                           && request.auth.uid in resource.data.participants;
//       allow delete: if request.auth != null && (
//         request.auth.uid in resource.data.participants ||
//         isAdmin()
//       );
//     }

//     // Messages inside Chats: Participants only
//     match /chats/{chatId}/messages/{messageId} {
//       allow read, write: if request.auth != null
//         && request.auth.uid in get(/databases/$(database)/documents/chats/$(chatId)).data.participants;
//       allow delete: if isAdmin();
//     }

//     // Notifications: Only orphanage or donor can read/write
//     match /notifications/{userId}/userNotifications/{chatId} {
//       allow read, write: if request.auth != null && request.auth.uid == userId;
//       allow delete: if isAdmin();
//     }

//     // Contact Us: Anyone can create; only authenticated can read
//     match /contact-us/{messageId} {
//       allow create: if true;
//       allow read: if request.auth != null || isAdmin();
//       allow delete: if isAdmin();
//     }

//     // Public Donations from Unauthenticated Form
//     match /publicDonations/{donationId} {
//       allow create: if true;
//       allow read: if true;
//       allow delete: if isAdmin();
//     }

//     // Service Fulfillment Logs
//     match /serviceFulfillmentLogs/{logId} {
//       allow create: if request.auth != null;
//       allow read: if isAdmin();
//       allow update, delete: if isAdmin();
//     }

//     // Admin audit logs
//     match /adminAuditLogs/{logId} {
//       allow create, read: if isAdmin();
//       allow update, delete: if false; // Audit logs should be immutable
//     }
//   }
// }

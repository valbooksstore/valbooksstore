// Initializes Firebase (Auth + Firestore) using the modular SDK via CDN.
// No npm install / build step needed — works directly on GitHub Pages.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut, updateProfile,
  updateEmail, EmailAuthProvider, reauthenticateWithCredential,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, collection, doc, getDoc, getDocs, addDoc, setDoc,
  deleteDoc, query, where, orderBy, serverTimestamp, runTransaction,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { firebaseConfig, isConfigured } from "./config.js";

let app = null, auth = null, db = null;

if (isConfigured()) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

export {
  auth, db, isConfigured,
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, updateProfile, updateEmail, EmailAuthProvider, reauthenticateWithCredential,
  collection, doc, getDoc, getDocs, addDoc, setDoc, deleteDoc,
  query, where, orderBy, serverTimestamp, runTransaction,
};

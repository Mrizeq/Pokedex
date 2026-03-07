// Firebase core
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

// Authentication
import {
getAuth,
GoogleAuthProvider,
signInWithPopup,
signOut,
onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Firestore database
import {
getFirestore,
doc,
setDoc,
getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBHBOCpicZXBg1u0R3ns74ypqSdPEUMu7c",
    authDomain: "pokedextracker-52c43.firebaseapp.com",
    projectId: "pokedextracker-52c43",
    storageBucket: "pokedextracker-52c43.firebasestorage.app",
    messagingSenderId: "863258675785",
    appId: "1:863258675785:web:cbca73ce34fb3c28b40d98",
    measurementId: "G-6TKW9G9WN1"
  };

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
export { doc, setDoc, getDoc };
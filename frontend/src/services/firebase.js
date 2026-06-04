// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { getFirestore, collection, addDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDsKGM18uyf-2l1q4SPKR5mP4Uox9UR_Do",
  authDomain: "fairloan-ai.firebaseapp.com",
  projectId: "fairloan-ai",
  storageBucket: "fairloan-ai.firebasestorage.app",
  messagingSenderId: "325944182209",
  appId: "1:325944182209:web:0c31f8b9569c9c17015b40",
  measurementId: "G-5TKMPG8GJ2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Firebase Login Error", error);
    throw error;
  }
};

export const logout = async () => {
  return signOut(auth);
};

export const savePredictionToFirestore = async (userId, predictionData) => {
  try {
    const docRef = await addDoc(collection(db, "predictions"), {
      userId,
      ...predictionData,
      timestamp: new Date()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error saving prediction", error);
  }
};

export { auth, db };

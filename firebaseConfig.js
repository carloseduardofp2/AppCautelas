import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCFTKB9S7C0bn8_VOH7VA_9a7UWcVOI79Y",
  authDomain: "appcautelas.firebaseapp.com",
  projectId: "appcautelas",
  storageBucket: "appcautelas.firebasestorage.app",
  messagingSenderId: "231215844046",
  appId: "1:231215844046:web:e106fd1f198480e1001e9f",
  measurementId: "G-BFMTYHNLKR"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
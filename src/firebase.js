import { initializeApp } from "firebase/app";
import { GoogleAuthProvider, getAuth, onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { firebaseConfig } from "./config.js";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
auth.languageCode = "es";

export const entrar = () => signInWithPopup(auth, new GoogleAuthProvider());
export const salir = () => signOut(auth);
export const alCambiarSesion = (cb) => onAuthStateChanged(auth, cb);

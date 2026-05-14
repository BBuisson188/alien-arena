export const firebaseConfig = {
  apiKey: "AIzaSyASExWcY08MBQApypJPwPLsmHQtlyAwb5Q",
  authDomain: "beau-games.firebaseapp.com",
  projectId: "beau-games",
  storageBucket: "beau-games.firebasestorage.app",
  messagingSenderId: "683259848665",
  appId: "1:683259848665:web:33ab5572b30af9634d5bc8",
};

export function hasFirebaseConfig(config = firebaseConfig) {
  return Boolean(
    config.apiKey &&
      config.projectId &&
      config.appId &&
      !config.apiKey.includes("YOUR_") &&
      !config.projectId.includes("YOUR_")
  );
}

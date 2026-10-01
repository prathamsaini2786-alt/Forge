import { useState } from "react";
import AuthScreen from "./components/Auth/AuthScreen";

function App() {
  const [user, setUser] = useState(null);

  if (!user) {
    return (
      <AuthScreen
        onLogin={(userData) => setUser(userData)}
      />
    );
  }

  return (
    <div>
      <h1>Welcome to FORGE</h1>
      <p>Hello, {user.username}</p>
    </div>
  );
}

export default App;
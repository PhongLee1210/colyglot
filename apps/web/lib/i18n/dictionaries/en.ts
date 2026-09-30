export const en = {
  settings: {
    open: "Game settings",
    title: "Settings",
    courseLanguage: "Course language",
    interfaceLanguage: "Interface language",
    playing: "Playing",
    switching: "Switching…",
    switch: "Switch",
    start: "Start",
    music: "Music",
    mute: "Mute music",
    unmute: "Unmute music",
    volumeLabel: "Music volume",
    saved: "Settings saved",
  },
  account: {
    open: "Account",
    title: "Account",
    signOut: "Sign out",
  },
  signIn: {
    heading: "Welcome back",
    subtitle: "Sign in to keep your streak and your decks.",
    errorCallback:
      "That sign-in link is invalid or expired — request a new one.",
    errorOauth: "Google sign-in isn't available yet.",
    sentPrefix: "Check your email — we sent a sign-in link to",
    sentSuffix: ".",
    useDifferentEmail: "Use a different email",
    emailLabel: "Email",
    emailPlaceholder: "you@example.com",
    sending: "Sending…",
    sendMagicLink: "Send magic link",
    or: "or",
    continueWithGoogle: "Continue with Google",
    emailFormLabel: "Sign in with email",
  },
  farm: {
    welcomeToFarm: (name: string) => `Welcome to your ${name} farm`,
    connectionLost: "Connection lost — check your network and try again",
  },
};

export type Dictionary = typeof en;

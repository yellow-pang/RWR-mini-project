const USER_ID_KEY = "rwr_user_id";
let memoryUserId = null;

function createUuid() {
  return (
    crypto.randomUUID?.() ||
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
      const random = (Math.random() * 16) | 0;
      const value = char === "x" ? random : (random & 0x3) | 0x8;
      return value.toString(16);
    })
  );
}

export function getUserId() {
  try {
    const storedUserId = localStorage.getItem(USER_ID_KEY);
    if (storedUserId) return storedUserId;

    const userId = createUuid();
    localStorage.setItem(USER_ID_KEY, userId);
    return userId;
  } catch {
    if (!memoryUserId) {
      memoryUserId = createUuid();
    }
    return memoryUserId;
  }
}

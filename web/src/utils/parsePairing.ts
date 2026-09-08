export interface ParsedPairingData {
  roomCode: string;
  secretKey?: string;
}

export function parsePairingUrlOrCode(input: string): ParsedPairingData {
  const raw = input.trim();
  if (!raw) return { roomCode: '' };

  try {
    if (raw.includes('?') && (raw.includes('room=') || raw.includes('r='))) {
      const queryString = raw.substring(raw.indexOf('?'));
      const params = new URLSearchParams(queryString);
      const roomParam = params.get('room') || params.get('r');
      const keyParam = params.get('key') || params.get('k');

      if (roomParam) {
        const cleanedRoom = roomParam.trim().toUpperCase();
        const formattedRoom = cleanedRoom.startsWith('HOPP-') ? cleanedRoom : `HOPP-${cleanedRoom}`;
        const secretKey = keyParam ? keyParam.trim().toUpperCase() : undefined;
        return { roomCode: formattedRoom, secretKey };
      }
    }
  } catch {
    // Fallback if parsing fails
  }

  const cleaned = raw.toUpperCase();
  const formattedRoom = cleaned.startsWith('HOPP-') ? cleaned : `HOPP-${cleaned}`;
  return { roomCode: formattedRoom };
}

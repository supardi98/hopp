export async function detectLocalLanIp(): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.RTCPeerConnection) {
      resolve(null);
      return;
    }

    try {
      const pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel('');
      let foundIp: string | null = null;

      pc.onicecandidate = (event) => {
        if (!event.candidate || !event.candidate.candidate) {
          pc.close();
          resolve(foundIp);
          return;
        }

        const candidateStr = event.candidate.candidate;
        // Search for IPv4 LAN pattern (192.168.x.x, 10.x.x.x, 172.16-31.x.x, 100.64-127.x.x)
        const match = candidateStr.match(
          /(?:192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+|100\.(?:6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\.\d+\.\d+)/
        );

        if (match && !foundIp) {
          foundIp = match[0];
          pc.close();
          resolve(foundIp);
        }
      };

      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .catch(() => {
          pc.close();
          resolve(null);
        });

      setTimeout(() => {
        pc.close();
        resolve(foundIp);
      }, 1000);
    } catch {
      resolve(null);
    }
  });
}

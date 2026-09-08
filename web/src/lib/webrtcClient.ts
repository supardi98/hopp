import type { ClipboardItem } from '../types';

export interface WebRTCSignalData {
  type: 'WEBRTC_SIGNAL';
  senderDeviceId: string;
  targetDeviceId?: string;
  signal: {
    type: 'offer' | 'answer' | 'candidate';
    sdp?: string;
    candidate?: RTCIceCandidateInit;
  };
  roomCode: string;
}

type SignalSender = (data: WebRTCSignalData) => void;
type ItemHandler = (item: ClipboardItem) => void;
type P2PStatusHandler = (connectedPeersCount: number, activePeerIds: string[]) => void;

class WebRTCManager {
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  private signalSender: SignalSender | null = null;
  private itemHandlers: ItemHandler[] = [];
  private p2pStatusHandlers: P2PStatusHandler[] = [];
  private currentDeviceId: string = '';
  private currentRoomCode: string = '';
  private enabled: boolean = true;

  private iceConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ],
    iceCandidatePoolSize: 10,
  };

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'RTCPeerConnection' in window;
  }

  public init(deviceId: string, roomCode: string, sender: SignalSender) {
    this.currentDeviceId = deviceId;
    this.currentRoomCode = roomCode;
    this.signalSender = sender;
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.closeAll();
    }
  }

  public isP2PActive(): boolean {
    if (!this.enabled || !this.isSupported()) return false;
    for (const channel of this.dataChannels.values()) {
      if (channel.readyState === 'open') return true;
    }
    return false;
  }

  public getActivePeerIds(): string[] {
    const active: string[] = [];
    this.dataChannels.forEach((channel, peerId) => {
      if (channel.readyState === 'open') {
        active.push(peerId);
      }
    });
    return active;
  }

  public onItemReceived(handler: ItemHandler) {
    this.itemHandlers.push(handler);
    return () => {
      this.itemHandlers = this.itemHandlers.filter((h) => h !== handler);
    };
  }

  private pendingCandidates: Map<string, RTCIceCandidateInit[]> = new Map();

  public onP2PStatusChange(handler: P2PStatusHandler) {
    this.p2pStatusHandlers.push(handler);
    return () => {
      this.p2pStatusHandlers = this.p2pStatusHandlers.filter((h) => h !== handler);
    };
  }

  public initiateConnection(targetDeviceId: string) {
    if (!this.enabled || !this.isSupported() || !targetDeviceId || targetDeviceId === this.currentDeviceId) return;
    
    const existingPc = this.peerConnections.get(targetDeviceId);
    if (existingPc) {
      if (existingPc.connectionState === 'failed' || existingPc.connectionState === 'closed' || existingPc.iceConnectionState === 'failed' || existingPc.iceConnectionState === 'closed') {
        existingPc.close();
        this.peerConnections.delete(targetDeviceId);
        this.dataChannels.delete(targetDeviceId);
      } else {
        return;
      }
    }

    // Deterministic Initiator: Only the peer with larger ID initiates offer to prevent glare race condition
    if (this.currentDeviceId <= targetDeviceId) return;

    try {
      const pc = new RTCPeerConnection(this.iceConfig);
      this.peerConnections.set(targetDeviceId, pc);

      this.attachConnectionListeners(pc, targetDeviceId);

      const channel = pc.createDataChannel('hopp-p2p', { ordered: true });
      this.setupDataChannel(targetDeviceId, channel);

      pc.onicecandidate = (event) => {
        if (event.candidate && this.signalSender) {
          const candJson = {
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid ?? '0',
            sdpMLineIndex: event.candidate.sdpMLineIndex ?? 0,
          };
          this.signalSender({
            type: 'WEBRTC_SIGNAL',
            senderDeviceId: this.currentDeviceId,
            targetDeviceId,
            signal: {
              type: 'candidate',
              candidate: candJson,
            },
            roomCode: this.currentRoomCode,
          });
        }
      };

      pc.createOffer().then((offer) => {
        pc.setLocalDescription(offer);
        if (this.signalSender) {
          this.signalSender({
            type: 'WEBRTC_SIGNAL',
            senderDeviceId: this.currentDeviceId,
            targetDeviceId,
            signal: {
              type: 'offer',
              sdp: offer.sdp,
            },
            roomCode: this.currentRoomCode,
          });
        }
      });
    } catch (err) {
      console.warn('[WebRTC P2P] Failed to initiate connection:', err);
    }
  }

  private attachConnectionListeners(pc: RTCPeerConnection, targetDeviceId: string) {
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.cleanupPeer(targetDeviceId, pc);
      }
    };
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
        this.cleanupPeer(targetDeviceId, pc);
      }
    };
  }

  private cleanupPeer(targetDeviceId: string, pc: RTCPeerConnection) {
    if (this.peerConnections.get(targetDeviceId) === pc) {
      pc.close();
      this.peerConnections.delete(targetDeviceId);
      const channel = this.dataChannels.get(targetDeviceId);
      if (channel) {
        channel.close();
        this.dataChannels.delete(targetDeviceId);
      }
      this.notifyStatusChange();
    }
  }

  public async handleSignal(data: WebRTCSignalData) {
    if (!this.enabled || !this.isSupported()) return;
    const { senderDeviceId, targetDeviceId, signal } = data;
    if (!senderDeviceId || senderDeviceId === this.currentDeviceId) return;
    if (targetDeviceId && targetDeviceId !== this.currentDeviceId) return;

    try {
      if (signal.type === 'offer') {
        let pc = this.peerConnections.get(senderDeviceId);
        if (pc && (pc.connectionState === 'closed' || pc.connectionState === 'failed' || pc.iceConnectionState === 'failed' || pc.signalingState === 'have-local-offer')) {
          pc.close();
          this.peerConnections.delete(senderDeviceId);
          pc = undefined;
        }

        if (!pc) {
          pc = new RTCPeerConnection(this.iceConfig);
          this.peerConnections.set(senderDeviceId, pc);
          this.attachConnectionListeners(pc, senderDeviceId);
        }

        pc.ondatachannel = (event) => {
          this.setupDataChannel(senderDeviceId, event.channel);
        };

        pc.onicecandidate = (event) => {
          if (event.candidate && this.signalSender) {
            const candJson = {
              candidate: event.candidate.candidate,
              sdpMid: event.candidate.sdpMid ?? '0',
              sdpMLineIndex: event.candidate.sdpMLineIndex ?? 0,
            };
            this.signalSender({
              type: 'WEBRTC_SIGNAL',
              senderDeviceId: this.currentDeviceId,
              targetDeviceId: senderDeviceId,
              signal: {
                type: 'candidate',
                candidate: candJson,
              },
              roomCode: this.currentRoomCode,
            });
          }
        };

        try {
          await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: signal.sdp }));
        } catch (err: any) {
          if (err?.name === 'InvalidStateError') return;
          throw err;
        }
        
        // Process buffered candidates for this peer
        const pending = this.pendingCandidates.get(senderDeviceId) || [];
        for (const cand of pending) {
          await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
        }
        this.pendingCandidates.delete(senderDeviceId);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        if (this.signalSender) {
          this.signalSender({
            type: 'WEBRTC_SIGNAL',
            senderDeviceId: this.currentDeviceId,
            targetDeviceId: senderDeviceId,
            signal: {
              type: 'answer',
              sdp: answer.sdp,
            },
            roomCode: this.currentRoomCode,
          });
        }
      } else if (signal.type === 'answer') {
        const pc = this.peerConnections.get(senderDeviceId);
        if (pc) {
          if (pc.signalingState === 'have-local-offer') {
            try {
              await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: signal.sdp }));
              
              const pending = this.pendingCandidates.get(senderDeviceId) || [];
              for (const cand of pending) {
                await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
              }
              this.pendingCandidates.delete(senderDeviceId);
            } catch (err: any) {
              // Duplicate or late answer signal when peer is already stable is harmless in WebRTC
              if (err?.name === 'InvalidStateError' || (pc.signalingState as string) === 'stable') {
                return;
              }
              console.warn('[WebRTC P2P] Answer error:', err);
            }
          }
        }
      } else if (signal.type === 'candidate') {
        const pc = this.peerConnections.get(senderDeviceId);
        if (pc && pc.remoteDescription && pc.remoteDescription.type) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate)).catch(() => {});
        } else if (signal.candidate) {
          if (!this.pendingCandidates.has(senderDeviceId)) {
            this.pendingCandidates.set(senderDeviceId, []);
          }
          this.pendingCandidates.get(senderDeviceId)!.push(signal.candidate);
        }
      }
    } catch (err) {
      console.warn('[WebRTC P2P] Signal handling error:', err);
    }
  }

  public sendItemP2P(item: ClipboardItem): boolean {
    if (!this.enabled || !this.isSupported()) return false;
    let sentCount = 0;

    const payload = JSON.stringify({ type: 'P2P_CLIPBOARD_ITEM', item });

    this.dataChannels.forEach((channel) => {
      if (channel.readyState === 'open') {
        try {
          channel.send(payload);
          sentCount++;
        } catch (err) {
          console.warn('[WebRTC P2P] Send failed:', err);
        }
      }
    });

    return sentCount > 0;
  }

  public sendRemoteControlInputP2P(targetDeviceId: string, payload: any): boolean {
    if (!this.enabled || !this.isSupported()) return false;
    const channel = this.dataChannels.get(targetDeviceId);
    if (channel && channel.readyState === 'open') {
      try {
        channel.send(JSON.stringify({ type: 'REMOTE_CONTROL_INPUT', ...payload }));
        return true;
      } catch (err) {
        return false;
      }
    }
    return false;
  }

  public closeAll() {
    this.dataChannels.forEach((ch) => ch.close());
    this.peerConnections.forEach((pc) => pc.close());
    this.dataChannels.clear();
    this.peerConnections.clear();
    this.notifyStatusChange();
  }

  private setupDataChannel(peerId: string, channel: RTCDataChannel) {
    this.dataChannels.set(peerId, channel);

    channel.onopen = () => {
      console.log(`[WebRTC P2P] DataChannel OPEN with peer ${peerId}`);
      this.notifyStatusChange();
    };

    channel.onclose = () => {
      console.log(`[WebRTC P2P] DataChannel CLOSED with peer ${peerId}`);
      this.dataChannels.delete(peerId);
      this.peerConnections.delete(peerId);
      this.notifyStatusChange();
    };

    channel.onerror = (err) => {
      console.warn(`[WebRTC P2P] Channel error with peer ${peerId}:`, err);
    };

    channel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'P2P_CLIPBOARD_ITEM') {
          this.itemHandlers.forEach((h) => h(data.item));
        } else if (data.type === 'REMOTE_CONTROL_INPUT') {
          if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
            import('@tauri-apps/api/core')
              .then(({ invoke }) => {
                invoke('execute_remote_input', {
                  action: data.action,
                  dx: Math.round(data.dx || 0),
                  dy: Math.round(data.dy || 0),
                  text: data.text || '',
                  key: data.key || '',
                }).catch(() => {});
              })
              .catch(() => {});
          }
        }
      } catch (err) {
        console.warn('[WebRTC P2P] Failed to parse DataChannel message:', err);
      }
    };
  }

  private notifyStatusChange() {
    const activePeerIds = this.getActivePeerIds();
    this.p2pStatusHandlers.forEach((handler) => handler(activePeerIds.length, activePeerIds));
  }
}

export const webrtcManager = new WebRTCManager();

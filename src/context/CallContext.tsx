"use client";

import {
  createContext, useContext, useRef, useState,
  useEffect, useCallback, type ReactNode,
} from "react";
import { Room, RoomEvent, ConnectionState } from "livekit-client";
import { RoomContext, RoomAudioRenderer } from "@livekit/components-react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";

const MiniCall = dynamic(() => import("@/components/MiniCall"), { ssr: false });

// ─── Types ────────────────────────────────────────────────────────────────────

export interface JoinCallParams {
  serverUrl: string;
  token: string;
  roomId: string;
  myName: string;
  otherName: string;
  role: "student" | "tutor";
  isSandbox?: boolean;
  scheduledAt?: string;
  durationMins?: number;
  bookingId?: string;
}

interface CallCtxValue {
  room: Room;
  isInCall: boolean;
  roomId: string | null;
  connectionState: ConnectionState;
  myName: string;
  otherName: string;
  role: "student" | "tutor";
  isSandbox: boolean;
  overlayOpen: boolean;
  elapsed: number;
  durationMins: number | undefined;
  bookingId: string | undefined;
  /** Ref that leaveCall() sets to true so ClassroomView suppresses its disconnect overlay. */
  intentionalLeaveRef: React.MutableRefObject<boolean>;
  joinCall(p: JoinCallParams): Promise<void>;
  leaveCall(): Promise<void>;
  setOverlayOpen(open: boolean): void;
}

const CallContext = createContext<CallCtxValue | null>(null);

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be inside CallProvider");
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CallProvider({ children }: { children: ReactNode }) {
  const roomRef  = useRef<Room>(new Room({ adaptiveStream: true, dynacast: true }));
  const room     = roomRef.current;
  const joiningRef         = useRef(false);
  const intentionalLeaveRef = useRef(false);

  const [isInCall,        setIsInCall]        = useState(false);
  const [roomId,          setRoomId]          = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.Disconnected);
  const [myName,          setMyName]          = useState("");
  const [otherName,       setOtherName]       = useState("");
  const [role,            setRole]            = useState<"student" | "tutor">("student");
  const [isSandbox,       setIsSandbox]       = useState(false);
  const [overlayOpen,     setOverlayOpen]     = useState(false);
  const [elapsed,         setElapsed]         = useState(0);
  const [durationMins,    setDurationMins]    = useState<number | undefined>();
  const [bookingId,       setBookingId]       = useState<string | undefined>();
  const startTimeRef = useRef(0);

  // Timer — survives navigation because it lives in the provider
  useEffect(() => {
    if (!isInCall) return;
    const id = setInterval(
      () => setElapsed(Math.max(0, Math.floor((Date.now() - startTimeRef.current) / 1000))),
      1000,
    );
    return () => clearInterval(id);
  }, [isInCall]);

  // Room state listener
  useEffect(() => {
    const onState = (state: ConnectionState) => {
      setConnectionState(state);
      if (state === ConnectionState.Disconnected) {
        intentionalLeaveRef.current = false;
        setIsInCall(false);
        setRoomId(null);
        setOverlayOpen(false);
        setElapsed(0);
      }
    };
    room.on(RoomEvent.ConnectionStateChanged, onState);
    return () => { room.off(RoomEvent.ConnectionStateChanged, onState); };
  }, [room]);

  // Disconnect on tab/window close
  useEffect(() => {
    const onUnload = () => {
      if (room.state !== ConnectionState.Disconnected) room.disconnect();
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [room]);

  const joinCall = useCallback(async (p: JoinCallParams) => {
    // Guard against concurrent calls
    if (joiningRef.current) return;

    // Already in the same room and connected — no-op
    if (
      isInCall && roomId === p.roomId &&
      (room.state === ConnectionState.Connected || room.state === ConnectionState.Reconnecting)
    ) return;

    joiningRef.current = true;
    try {
      if (room.state !== ConnectionState.Disconnected) await room.disconnect();

      setMyName(p.myName);
      setOtherName(p.otherName);
      setRole(p.role);
      setIsSandbox(p.isSandbox ?? false);
      setRoomId(p.roomId);
      setDurationMins(p.durationMins);
      setBookingId(p.bookingId);
      startTimeRef.current = p.scheduledAt ? new Date(p.scheduledAt).getTime() : Date.now();

      await room.connect(p.serverUrl, p.token, { autoSubscribe: true });

      // Enable mic and camera (mirrors LiveKitRoom video={true} audio={true})
      try { await room.localParticipant.setMicrophoneEnabled(true); } catch { /* denied */ }
      try { await room.localParticipant.setCameraEnabled(true);     } catch { /* denied */ }

      setIsInCall(true);
    } finally {
      joiningRef.current = false;
    }
  }, [isInCall, roomId, room]);

  const leaveCall = useCallback(async () => {
    intentionalLeaveRef.current = true;
    // Call booking-complete API (real sessions only)
    if (bookingId && !isSandbox) {
      try { await fetch(`/api/bookings/${bookingId}/complete`, { method: "PATCH" }); } catch { /* best-effort */ }
    }
    await room.disconnect();
    // ConnectionStateChanged → Disconnected will reset state
  }, [room, bookingId, isSandbox]);

  // Show MiniCall when in a call AND (not on classroom page OR overlay is open)
  const pathname     = usePathname();
  const onClassroom  = !!pathname?.match(/^\/classroom\//);
  const showMini     = isInCall && (!onClassroom || overlayOpen);

  const value: CallCtxValue = {
    room, isInCall, roomId, connectionState,
    myName, otherName, role, isSandbox, overlayOpen,
    elapsed, durationMins, bookingId,
    intentionalLeaveRef,
    joinCall, leaveCall, setOverlayOpen,
  };

  return (
    <CallContext.Provider value={value}>
      <RoomContext.Provider value={room}>
        {children}
        {isInCall  && <RoomAudioRenderer />}
        {showMini  && <MiniCall />}
      </RoomContext.Provider>
    </CallContext.Provider>
  );
}

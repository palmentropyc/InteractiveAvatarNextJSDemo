import type { StartAvatarResponse } from "@heygen/streaming-avatar";

import StreamingAvatar, {
  AvatarQuality,
  StreamingEvents, TaskMode, TaskType, VoiceEmotion,
} from "@heygen/streaming-avatar";
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  Divider,
  Input,
  Select,
  SelectItem,
  Spinner,
  Chip,
  Tabs,
  Tab,
} from "@nextui-org/react";
import { useEffect, useRef, useState } from "react";
import { useMemoizedFn, usePrevious } from "ahooks";
import { GraduationCap, CircleDot, Mic, X, LogOut } from "lucide-react";

import InteractiveAvatarTextInput from "./InteractiveAvatarTextInput";

import {AVATARS, STT_LANGUAGE_LIST} from "@/app/lib/constants";

export default function InteractiveAvatar() {
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [isLoadingRepeat, setIsLoadingRepeat] = useState(false);
  const [stream, setStream] = useState<MediaStream>();
  const [debug, setDebug] = useState<string>();
  const [data, setData] = useState<StartAvatarResponse>();
  const [text, setText] = useState<string>("");
  const mediaStream = useRef<HTMLVideoElement>(null);
  const avatar = useRef<StreamingAvatar | null>(null);
  const [chatMode, setChatMode] = useState("text_mode");
  const [isUserTalking, setIsUserTalking] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  async function fetchAccessToken() {
    try {
      const response = await fetch("/api/get-access-token", {
        method: "POST",
      });
      const token = await response.text();

      console.log("Access Token:", token); // Log the token to verify

      return token;
    } catch (error) {
      console.error("Error fetching access token:", error);
    }

    return "";
  }

  async function initializeCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true,
        audio: false // No necesitamos audio aquí ya que el micrófono lo maneja Heygen
      });
      setLocalStream(stream);
    } catch (error) {
      console.error("Error accessing camera:", error);
    }
  }

  async function startSession() {
    setIsLoadingSession(true);
    const newToken = await fetchAccessToken();

    avatar.current = new StreamingAvatar({
      token: newToken,
    });
    avatar.current.on(StreamingEvents.AVATAR_START_TALKING, (e) => {
      console.log("Avatar started talking", e);
    });
    avatar.current.on(StreamingEvents.AVATAR_STOP_TALKING, (e) => {
      console.log("Avatar stopped talking", e);
    });
    avatar.current.on(StreamingEvents.STREAM_DISCONNECTED, () => {
      console.log("Stream disconnected");
      endSession();
    });
    avatar.current?.on(StreamingEvents.STREAM_READY, (event) => {
      console.log(">>>>> Stream ready:", event.detail);
      setStream(event.detail);
    });
    avatar.current?.on(StreamingEvents.USER_START, (event) => {
      console.log(">>>>> User started talking:", event);
      setIsUserTalking(true);
    });
    avatar.current?.on(StreamingEvents.USER_STOP, (event) => {
      console.log(">>>>> User stopped talking:", event);
      setIsUserTalking(false);
    });
    try {
      const avatarId = process.env.NEXT_PUBLIC_AVATAR_ID;
      const knowledgeId = process.env.NEXT_PUBLIC_KNOWLEDGE_BASE_ID;
      const voiceId = process.env.NEXT_PUBLIC_VOICE_ID;

      if (!avatarId || !knowledgeId || !voiceId) {
        console.error("Environment variables:", { avatarId, knowledgeId, voiceId });
        throw new Error("Missing environment variables");
      }

      const res = await avatar.current.createStartAvatar({
        quality: AvatarQuality.High,
        avatarName: avatarId,
        knowledgeId: knowledgeId,
        voice: {
          rate: 1,
          voiceId: voiceId,
          emotion: VoiceEmotion.EXCITED,
        },
        language: 'es',
      });

      setData(res);
      await avatar.current?.startVoiceChat();
      setChatMode("voice_mode");
      
      await initializeCamera();
    } catch (error) {
      console.error("Error starting avatar session:", error);
      setDebug(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsLoadingSession(false);
    }
  }
  async function handleSpeak() {
    setIsLoadingRepeat(true);
    if (!avatar.current) {
      setDebug("Avatar API not initialized");

      return;
    }
    // speak({ text: text, task_type: TaskType.REPEAT })
    await avatar.current.speak({ text: text, taskType: TaskType.REPEAT, taskMode: TaskMode.SYNC }).catch((e) => {
      setDebug(e.message);
    });
    setIsLoadingRepeat(false);
  }
  async function handleInterrupt() {
    if (!avatar.current) {
      setDebug("Avatar API not initialized");

      return;
    }
    await avatar.current
      .interrupt()
      .catch((e) => {
        setDebug(e.message);
      });
  }
  async function endSession() {
    await avatar.current?.stopAvatar();
    setStream(undefined);
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
  }

  const handleChangeChatMode = useMemoizedFn(async (v) => {
    if (v === chatMode) {
      return;
    }
    if (v === "text_mode") {
      avatar.current?.closeVoiceChat();
    } else {
      await avatar.current?.startVoiceChat();
    }
    setChatMode(v);
  });

  const previousText = usePrevious(text);
  useEffect(() => {
    if (!previousText && text) {
      avatar.current?.startListening();
    } else if (previousText && !text) {
      avatar?.current?.stopListening();
    }
  }, [text, previousText]);

  useEffect(() => {
    return () => {
      endSession();
    };
  }, []);

  useEffect(() => {
    if (stream && mediaStream.current) {
      mediaStream.current.srcObject = stream;
      mediaStream.current.onloadedmetadata = () => {
        mediaStream.current!.play();
        setDebug("Playing");
      };
    }
  }, [mediaStream, stream]);

  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  return (
    <div className="w-full max-w-[1200px] mx-auto">
      <div className="text-center mb-8 px-4">
        <div className="flex items-center justify-center gap-6 mb-10">
          <div className="relative flex-shrink-0">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-xl" />
            <div className="relative bg-white p-3 rounded-full shadow-md border border-gray-100">
              <GraduationCap className="w-10 h-10 text-blue-600" />
            </div>
          </div>
          <div className="space-y-2 text-left">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
              Welcome to Hawkings Tutor
            </h1>
            <p className="text-base text-gray-600 max-w-2xl">
              Your AI-powered tutor, ready to help you ace your exams
            </p>
          </div>
        </div>

        {!stream && !isLoadingSession ? (
          <div className="mt-12">
            <Button
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white shadow-lg transition-all duration-200 rounded-xl text-lg font-medium px-8 py-4"
              size="lg"
              onClick={startSession}
            >
              Start Learning Session
            </Button>
          </div>
        ) : isLoadingSession ? (
          <div className="flex flex-col items-center gap-3 mt-12">
            <Spinner color="primary" size="lg" />
            <p className="text-gray-600">Preparing your tutor...</p>
          </div>
        ) : null}
      </div>
      
      {stream && (
        <Card className="border border-gray-100 shadow-lg rounded-2xl overflow-hidden bg-white/80 backdrop-blur-sm">
          <CardBody className="p-0">
            <div className="relative w-full bg-white">
              <div className="relative w-full aspect-video">
                <div className="absolute inset-0 bg-white" />
                
                <video
                  ref={mediaStream}
                  autoPlay
                  playsInline
                  className="absolute inset-0 w-full h-full object-contain"
                >
                  <track kind="captions" />
                </video>

                <div className="absolute inset-0 p-4">
                  {localStream && (
                    <div className="absolute top-4 right-4 w-[18%] aspect-video rounded-xl overflow-hidden shadow-lg border-2 border-white">
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover transform scale-x-[-1]"
                      />
                    </div>
                  )}

                  <div className="absolute bottom-4 right-4 flex flex-col gap-2">
                    <Button
                      className="bg-gradient-to-r from-red-500 to-rose-400 hover:opacity-90 text-white shadow-lg transition-all duration-200 rounded-full px-6"
                      size="sm"
                      onClick={handleInterrupt}
                      startContent={<X className="w-4 h-4" />}
                    >
                      Stop Response
                    </Button>
                    <Button
                      className="bg-gradient-to-r from-slate-700 to-slate-600 hover:opacity-90 text-white shadow-lg transition-all duration-200 rounded-full px-6"
                      size="sm"
                      onClick={endSession}
                      startContent={<LogOut className="w-4 h-4" />}
                    >
                      End Session
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardBody>
          
          <Divider className="bg-gray-100" />
          
          <CardFooter className="flex justify-center bg-white/80 backdrop-blur-sm p-4">
            <div
              className={`
                px-6 py-3 rounded-full transition-all duration-200 flex items-center gap-3
                ${isUserTalking 
                  ? 'bg-gradient-to-r from-green-500/10 to-emerald-400/10 text-green-600'
                  : 'bg-gradient-to-r from-blue-600/10 to-indigo-500/10 text-blue-600'
                }
              `}
            >
              {isUserTalking 
                ? <CircleDot className="w-4 h-4 animate-pulse" />
                : <Mic className="w-4 h-4" />
              }
              <span className="font-medium text-sm">
                {isUserTalking ? "Listening to your voice..." : "Waiting for your voice..."}
              </span>
            </div>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}

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

  return (
    <div className="w-[900px] mx-auto">
      <div className="text-center mb-8">
        <div className="relative flex flex-col items-center">
          <div className="mb-6 relative">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-xl" />
              <div className="relative bg-white p-4 rounded-full shadow-md border border-gray-100">
                <GraduationCap className="w-12 h-12 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
              Welcome to Hawkings Tutor
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Your AI-powered accounting tutor, ready to help you ace your exams with personalized guidance and practice
            </p>
          </div>

          {!stream && !isLoadingSession ? (
            <Button
              className="mt-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white shadow-lg transition-all duration-200 rounded-xl text-lg font-medium px-8 py-6"
              size="lg"
              onClick={startSession}
            >
              Start Learning Session
            </Button>
          ) : isLoadingSession ? (
            <div className="flex flex-col items-center gap-4 mt-8">
              <Spinner color="primary" size="lg" />
              <p className="text-gray-600">Preparing your tutor...</p>
            </div>
          ) : null}
        </div>
      </div>
      
      {stream && (
        <Card className="border border-gray-100 shadow-lg rounded-2xl overflow-hidden bg-white/80 backdrop-blur-sm">
          <CardBody className="h-[500px] flex flex-col justify-center items-center">
            <div className="h-[500px] w-full justify-center items-center flex rounded-xl overflow-hidden bg-white relative">
              <video
                ref={mediaStream}
                autoPlay
                playsInline
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
              >
                <track kind="captions" />
              </video>
              <div className="flex flex-col gap-3 absolute bottom-4 right-4">
                <Button
                  className="bg-gradient-to-r from-red-500 to-rose-400 hover:opacity-90 text-white shadow-lg transition-all duration-200 rounded-full px-8"
                  size="md"
                  onClick={handleInterrupt}
                  startContent={<X className="w-4 h-4" />}
                >
                  Stop Response
                </Button>
                <Button
                  className="bg-gradient-to-r from-slate-700 to-slate-600 hover:opacity-90 text-white shadow-lg transition-all duration-200 rounded-full px-8"
                  size="md"
                  onClick={endSession}
                  startContent={<LogOut className="w-4 h-4" />}
                >
                  End Session
                </Button>
              </div>
            </div>
          </CardBody>
          <Divider className="bg-gray-100" />
          <CardFooter className="flex flex-col gap-4 relative bg-white/80 backdrop-blur-sm p-6">
            {chatMode === "text_mode" ? (
              <div className="w-full flex relative">
                <InteractiveAvatarTextInput
                  disabled={!stream}
                  input={text}
                  label="Chat"
                  loading={isLoadingRepeat}
                  placeholder="Type something for the avatar to respond"
                  setInput={setText}
                  onSubmit={handleSpeak}
                />
                {text && (
                  <Chip className="absolute right-16 top-3">Listening</Chip>
                )}
              </div>
            ) : (
              <div className="w-full flex justify-center">
                <div
                  className={`
                    px-8 py-4 rounded-full transition-all duration-200 flex items-center gap-3
                    ${isUserTalking 
                      ? 'bg-gradient-to-r from-green-500/10 to-emerald-400/10 text-green-600'
                      : 'bg-gradient-to-r from-blue-600/10 to-indigo-500/10 text-blue-600'
                    }
                  `}
                >
                  {isUserTalking 
                    ? <CircleDot className="w-5 h-5 animate-pulse" />
                    : <Mic className="w-5 h-5" />
                  }
                  <span className="font-medium">
                    {isUserTalking ? "Listening to your voice..." : "Waiting for your voice..."}
                  </span>
                </div>
              </div>
            )}
          </CardFooter>
        </Card>
      )}
    </div>
  );
}

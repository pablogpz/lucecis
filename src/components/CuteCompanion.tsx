'use client';

import { useEffect, useRef, useState } from 'react';

interface CuteCompanionProps {
    message?: string;
    onMessageComplete?: () => void;
    isPresent?: boolean;
    isConnected?: boolean;
}

export default function CuteCompanion({
                                          message,
                                          onMessageComplete,
                                          isPresent = true,
                                          isConnected = true
                                      }: CuteCompanionProps) {
    const [pupilPosition, setPupilPosition] = useState({ x: 0, y: 0 });
    const [isBlinking, setIsBlinking] = useState(false);
    const [showMessage, setShowMessage] = useState(false);
    const companionRef = useRef<HTMLDivElement>(null);

    // Determine if the companion should be sleeping
    const isSleeping = !isPresent || !isConnected;

    // Follow cursor with pupils (only when awake)
    useEffect(() => {
        if (isSleeping) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!companionRef.current) return;

            const rect = companionRef.current.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            const deltaX = e.clientX - centerX;
            const deltaY = e.clientY - centerY;

            const maxDistance = 5;

            const normalizedX = Math.max(-maxDistance, Math.min(maxDistance, deltaX / 30));
            const normalizedY = Math.max(-maxDistance, Math.min(maxDistance, deltaY / 30));

            setPupilPosition({ x: normalizedX, y: normalizedY });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [isSleeping]);

    // Blinking animation (only when awake)
    useEffect(() => {
        if (isSleeping) return;

        const blinkInterval = setInterval(() => {
            setIsBlinking(true);
            setTimeout(() => setIsBlinking(false), 150); // Blink duration
        }, 3000 + Math.random() * 2000);

        return () => clearInterval(blinkInterval);
    }, [isSleeping]);

    // Handle message display
    useEffect(() => {
        if (message) {
            setShowMessage(true);
            const timer = setTimeout(() => {
                setShowMessage(false);
                onMessageComplete?.();
            }, 1500); // Show message for 1.5 seconds
            return () => clearTimeout(timer);
        }
    }, [message, onMessageComplete]);

    return (
        <div className="relative flex flex-col items-center">
            {/* Speech bubble */}
            {((showMessage && message) || isSleeping) && (
                <div
                    className="absolute -top-14 bg-white rounded-2xl px-4 py-2 shadow-lg border-2 border-purple-200 text-center text-nowrap">
                    <p className="text-sm text-gray-700 font-medium">{isSleeping ? 'Zzz' : message}</p>
                    {/* Bubble tail */}
                    <div
                        className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-purple-200"></div>
                    <div
                        className="absolute top-full left-1/2 transform -translate-x-1/2 translate-y-[-2px] w-0 h-0 border-l-6 border-r-6 border-t-6 border-l-transparent border-r-transparent border-t-white"></div>
                </div>
            )}

            {/* Cute cat companion */}
            <div
                ref={companionRef}
                className="relative w-20 h-16 transition-transform duration-300 hover:scale-110"
            >
                {/* Cat body */}
                <div
                    className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-12 h-8 bg-gradient-to-b from-orange-300 to-orange-400 rounded-full"></div>

                {/* Cat head */}
                <div
                    className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-16 h-12 bg-gradient-to-b from-orange-200 to-orange-300 rounded-full"></div>

                {/* Cat ears */}
                <div
                    className="absolute bottom-14 left-3 w-0 h-0 border-l-3 border-r-3 border-b-6 border-l-transparent border-r-transparent border-b-orange-200"></div>
                <div
                    className="absolute bottom-14 right-3 w-0 h-0 border-l-3 border-r-3 border-b-6 border-l-transparent border-r-transparent border-b-orange-200"></div>

                {/* Eyes */}
                <div className="absolute bottom-7 left-3.5">
                    {isSleeping ? (
                        // Closed eye when sleeping
                        <div className="mb-1.5 w-5 h-1/2 bg-gray-600 rounded-full border border-gray-600"></div>
                    ) : (
                        <div
                            className={`w-7 h-7 bg-white rounded-full border-2 border-gray-300 transition-transform duration-100 ${isBlinking ? 'scale-y-0' : 'scale-y-100'}`}
                        >
                            {/* Moving pupil */}
                            <div
                                className="w-4 h-4 bg-black rounded-full transition-transform duration-100"
                                style={{
                                    transform: `translate(${1.5 + pupilPosition.x}px, ${1.5 + pupilPosition.y}px)`,
                                }}
                            >
                                <div className="absolute top-0.5 left-0.5 w-1.5 h-1.5 bg-white rounded-full"></div>
                            </div>
                        </div>
                    )}
                </div>
                <div className="absolute bottom-7 right-3.5">
                    {isSleeping ? (
                        // Closed eye when sleeping
                        <div className="mb-1.5 w-5 h-1/2 bg-gray-600 rounded-full border border-gray-600"></div>
                    ) : (
                        <div
                            className={`w-7 h-7 bg-white rounded-full border-2 border-gray-300 transition-transform duration-100 ${isBlinking ? 'scale-y-0' : 'scale-y-100'}`}
                        >
                            {/* Moving pupil */}
                            <div
                                className="w-4 h-4 bg-black rounded-full transition-transform duration-100"
                                style={{
                                    transform: `translate(${1.5 + pupilPosition.x}px, ${1.5 + pupilPosition.y}px)`,
                                }}
                            >
                                <div className="absolute top-0.5 left-0.5 w-1.5 h-1.5 bg-white rounded-full"></div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Nose */}
                <div
                    className="absolute bottom-5 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-1 border-r-1 border-t-2 border-l-transparent border-r-transparent border-t-pink-400"></div>

                {/* Mouth */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                    <div className="w-0.5 h-1 bg-pink-400"></div>
                    <div
                        className="absolute top-1 -left-1 w-2 h-0.5 bg-pink-400 rounded-full transform rotate-12"></div>
                    <div
                        className="absolute top-1 -right-1 w-2 h-0.5 bg-pink-400 rounded-full transform -rotate-12"></div>
                </div>

                {/* Whiskers */}
                <div className="absolute bottom-6 left-1">
                    <div className="w-4 h-0.5 bg-gray-600 transform -rotate-12"></div>
                    <div className="w-3 h-0.5 bg-gray-600 mt-0.5"></div>
                </div>
                <div className="absolute bottom-6 right-1">
                    <div className="w-4 h-0.5 bg-gray-600 transform rotate-12"></div>
                    <div className="w-3 h-0.5 bg-gray-600 mt-0.5"></div>
                </div>

                {/* Tail */}
                <div
                    className="absolute bottom-1 -right-1 w-6 h-2 bg-orange-300 rounded-full transform rotate-45 origin-left">
                </div>
            </div>
        </div>
    );
}
